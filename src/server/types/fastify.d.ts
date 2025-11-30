 
import { JWT } from "@fastify/jwt";
import "fastify";
import { onRequestHookHandler } from "fastify";
import { Repository } from "typeorm";
import Comment from "../../data/entity/comment.entity";
import FieldTranslation from "../../data/entity/field_translation.entity";
import Option from "../../data/entity/option.entity";
import Person from "../../data/entity/person.entity";
import Language from "../../data/entity/profile/language.entity";
import User from "../../data/entity/user.entity";
import VolunteerListMV from "../../data/entity/volunteer/volunteer-list-mv.entity";
import Volunteer from "../../data/entity/volunteer/volunteer.entity";
import { AuthOptions } from "./auth";

declare module "fastify" {
  interface FastifyInstance {
    db: {
      userRepository: Repository<User>;
      personRepository: Repository<Person>;
      volunteerRepository: Repository<Volunteer>;
      languageRepository: Repository<Language>;
      fieldTranslationRepository: Repository<FieldTranslation>;
      optionRepository: Repository<Option>;
      volunteerListMvRepository: Repository<VolunteerListMV>;
      commentRepository: Repository<Comment>;
    };
    jwt: JWT;
    authenticate(opts?: AuthOptions): onRequestHookHandler;
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
  type TokenType = "access" | "refresh" | "verify";
  interface FastifyJWT {
    // Payload type when signing a token (`reply.jwtSign(payload)`)
    payload: {
      id: number;
      email: string;
      type?: TokenType;
    };
    // User type that will be attached to `request.user` after `request.jwtVerify()`
    user: {
      id: number;
      email: string;
      iat: number; // issued at (timestamp)
      exp: number; // expiration (timestamp)
    };
  }
}
