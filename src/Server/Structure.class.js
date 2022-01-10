import {Status} from "/src/Server/Status.enum.js";

export class Structure {
  constructor(status = Status.PLAY, version = "21w07a") {
    return (async function () {
      this.version = version;
      this.status = status;
      this.structure = await import("https://raw.githubusercontent.com/PrismarineJS/minecraft-data/master/data/pc/" + this.version + "/protocol.json", {assert: {type: "json"}});
      let rawTypes = await import("/data/types.json", {assert: {type: "json"}});
      this.types = rawTypes.default;
      this.load();
      return this;
    }.bind(this)());
  }

  load() {
    this.server = {};
    this.server.packetFromName = {};
    this.client = {};
    this.client.packetFromName = {};

    if(this.status === Status.PLAY) {
      // Server data
      this.serverData = this.structure.default.play.toClient;
      const serverMappings = this.serverData.types.packet[1][0].type[1].mappings;
      for(let key in serverMappings) {
        let packetId = parseInt(key, 16);
        let name = serverMappings[key];
        this.server[packetId] = {
          name: name,
          container: this.serverData.types["packet_" + name][1]
        }
        this.server.packetFromName[name] = packetId;
      }

      // Client data
      this.clientData = this.structure.default.play.toServer;
      const clientMappings = this.clientData.types.packet[1][0].type[1].mappings;
      for(let key in clientMappings) {
        let packetId = parseInt(key, 16);
        let name = clientMappings[key];
        this.client[packetId] = {
          name: name,
          container: this.clientData.types["packet_" + name][1]
        }
        this.client.packetFromName[name] = packetId;
      }
    }else if(this.status === Status.HANDSHAKE) {

      // Server data
      this.server[0] = {
        name: "server_info",
        container: [
          {
            "name": "response",
            "type": "string"
          }
        ]
      };
      this.server.packetFromName["server_info"] = 0;

      this.server[1] = {
        name: "pong",
        container: [
          {
            "name": "payload",
            "type": "i64"
          }
        ]
      };
      this.server.packetFromName["pong"] = 1;

      // Client data
      this.client[0] = {
        name: "set_protocol",
        container: [
          {
            "name": "protocolVersion",
            "type": "varint"
          },
          {
            "name": "serverHost",
            "type": "string"
          },
          {
            "name": "serverPort",
            "type": "u16"
          },
          {
            "name": "nextState",
            "type": "varint"
          }
        ]
      };
      this.client.packetFromName["set_protocol"] = 0;

      // Client server ping packet
      this.client[1] = {
        name: "ping",
        container: [
          {
            "name": "time",
            "type": "i64"
          }
        ]
      };
      this.client.packetFromName["ping"] = 1;

    }else if(this.status === Status.LOGIN) {
      // Server data
      this.server[1] = {
        name: "encryption_begin",
        container: [
          {
            "name": "serverId",
            "type": "string"
          },
          {
            "name": "publicKey",
            "type": "buffer",
            "count": "varint"
          },
          {
            "name": "verifyToken",
            "type": "buffer",
            "count": "varint"
          }
        ]
      };
      this.server.packetFromName["encryption_begin"] = 1;

      this.server[2] = {
        name: "login_success",
        container: [
          {
            "name": "UUID",
            "type": "UUID"
          },
          {
            "name": "username",
            "type": "string"
          }
        ]
      };
      this.server.packetFromName["login_success"] = 2;

      // Client data
      this.client[0] = {
        name: "login_start",
        container: [
          {
            "name": "username",
            "type": "string"
          }
        ]
      };
      this.client.packetFromName["login_start"] = 0;
    }
  }
}
