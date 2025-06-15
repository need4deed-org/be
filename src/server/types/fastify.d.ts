import { JWT } from "@fastify/jwt";
import "fastify";
import { Repository } from "typeorm";

import { Account } from "../../data/entity/account";
import { Person } from "../../data/entity/person";

declare module "fastify" {
  interface FastifyInstance {
    db: {
      accountRepository: Repository<Account>;
      personRepository: Repository<Person>;
    };
    jwt: JWT;
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
  interface FastifyRequest {
    resolvedPerson?: Person; // Optional resolved person for account creation
    personId?: number; // Optional foreign key ID for the Person entity
  }
}

declare module "@fastify/jwt" {
  // It's crucial to extend the original FastifyJWT interface here
  // so that your custom 'payload' and 'user' types merge correctly
  // with the types that @fastify/jwt already defines (like jwtSign and jwtVerify methods on reply/request).
  interface FastifyJWT {
    // Payload type when signing a token (`reply.jwtSign(payload)`)
    payload: { id: number; email: string };
    // User type that will be attached to `request.user` after `request.jwtVerify()`
    user: {
      id: number;
      email: string;
      iat: number; // issued at (timestamp)
      exp: number; // expiration (timestamp)
    };
  }
}
