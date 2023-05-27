//
// Augmentation of standard types with common objects uses throughout
// TiqDiet backend.
//
// See https://stackoverflow.com/questions/37377731/extend-express-request-object-using-typescript
//
declare namespace Express {
  export interface Request {
    session: {
      originalUrl?: string;
      authState?: string;
      _ageu?: {
        principal?: string;
        type: string;
        id?: string;
        email?: string;
        login?: string;
        phone?: string;
        picture?: string;
      };
    };
  }
}
