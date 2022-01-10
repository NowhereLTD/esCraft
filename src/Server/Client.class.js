import {Structure} from "/src/Server/Structure.class.js";
import {Packet} from "/src/Server/Packet.class.js";
import {Status} from "/src/Server/Status.enum.js";

export class Client extends EventTarget {
  constructor(connection, server) {
    super();
    return (async function () {
      this.connection = connection;
      this.server = server;
      await this.setStatus();
      this.register();
      return this;
    }.bind(this)());
  }

  async register() {
    for await (const packet of Deno.iter(this.connection)) {
      let mcPacket = new Packet(this.structure);
      mcPacket.parseRaw(packet);
      console.log(mcPacket.name);

      // Handshake
      if(mcPacket.name === "set_protocol") {
        if(mcPacket.nextState === Status.LOGIN) {
          await this.setStatus(Status.LOGIN);
        }else {
          let serverInfo = new Packet(this.structure);
          serverInfo.name = "server_info";
          serverInfo.response = JSON.stringify({
              "version": {
                  "name": this.server.version,
                  "protocol": mcPacket.protocolVersion
              },
              "players": {
                  "max": this.server.maxPlayer,
                  "online": this.server.clients.length
              },
              "description": {
                  "text": this.server.status
              }
          });
          serverInfo.getRaw();
          await this.connection.write(serverInfo.raw);
        }
      }

      if(mcPacket.name === "ping") {
        let pong = new Packet(this.structure);
        pong.name = "pong";
        pong.payload = mcPacket.time;
        pong.getRaw();
        await this.connection.write(pong.raw);
      }

      if(mcPacket.name === "login_start") {
        this.username = mcPacket.username;
        let beginEncrypt = new Packet(this.structure);
        beginEncrypt.name = "encryption_begin";
        beginEncrypt.serverId = "test";
        beginEncrypt.publicKey = this.server.publickeyBuffer;
        beginEncrypt.verifyToken = this.server.verifyToken;
        beginEncrypt.getRaw();
        await this.connection.write(beginEncrypt.raw);
      }

      this.dispatchEvent(new CustomEvent("packet.income", {
        detail: {
          packet: mcPacket
        }
      }));
    }
  }

  async setStatus(status = Status.HANDSHAKE) {
    this.status = status;
    this.structure = await new Structure(this.status);
    this.dispatchEvent(new CustomEvent("status.update", {
      detail: {
        status: this.status
      }
    }));
  }
}
