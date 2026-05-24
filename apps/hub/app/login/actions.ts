'use server';

import { signIn, type SignInResult } from '@/lib/auth';

export async function signInAction(email: string, password: string): Promise<SignInResult> {
  return signIn(email, password);
}
