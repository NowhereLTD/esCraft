import {Client} from "/src/Server/Client.class.js";


export class Server {
  constructor() {
    return (async function () {
      this.decoder = new TextDecoder();
      this.clients = [];
      this.version = "*";
      this.status = "§aesCraft";
      this.maxPlayer = 100;
      this.key = await crypto.subtle.generateKey({
        name: "RSA-OAEP",
        modulusLength: 1024,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-512"
      }, true, ["encrypt", "decrypt"]);
      this.publickeyBuffer = await crypto.subtle.exportKey("spki", this.key.publicKey);
      this.verifyToken = Array.from({length: 8}, () => Math.floor(Math.random() * 64));

      await this.listen();
    }.bind(this)());
  }

  async listen() {
    this.listener = Deno.listen({port: 25565, transport: "tcp"});
    for await(let connection of this.listener) {
      let client = new Client(connection, this);
    }
  }
}
