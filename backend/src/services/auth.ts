import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (!process.env.FIREBASE_ADMIN_KEY) {
  throw new Error('FIREBASE_ADMIN_KEY environment variable is required');
}

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY) as ServiceAccount;

const app = initializeApp({
  credential: cert(serviceAccount),
});

export const auth = getAuth(app);

export interface AuthUser {
  uid: string;
  email: string;
  name?: string;
  photoURL?: string;
}

export class AuthService {
  static async verifyToken(idToken: string): Promise<AuthUser> {
    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      
      return {
        uid: decodedToken.uid,
        email: decodedToken.email!,
        name: decodedToken.name,
        photoURL: decodedToken.picture,
      };
    } catch (error) {
      throw new Error('Invalid authentication token');
    }
  }

  static async getUserByUid(uid: string) {
    try {
      const userRecord = await auth.getUser(uid);
      return {
        uid: userRecord.uid,
        email: userRecord.email!,
        name: userRecord.displayName,
        photoURL: userRecord.photoURL,
      };
    } catch (error) {
      throw new Error('User not found');
    }
  }

  static async createUser(userData: {
    email: string;
    password: string;
    displayName?: string;
  }) {
    try {
      const userRecord = await auth.createUser({
        email: userData.email,
        password: userData.password,
        displayName: userData.displayName,
      });

      return {
        uid: userRecord.uid,
        email: userRecord.email!,
        name: userRecord.displayName,
      };
    } catch (error) {
      throw new Error('Failed to create user');
    }
  }

  static async deleteUser(uid: string) {
    try {
      await auth.deleteUser(uid);
      return true;
    } catch (error) {
      throw new Error('Failed to delete user');
    }
  }
}