import { FhenixClient, Permit } from "fhenixjs";

export interface FheContract {
  instance: FhenixClient;
  permit: Permit;
}

export async function createFheInstance(_provider:any,contractAddress: string): Promise<any> {
  const provider = _provider;

  return new FhenixClient({ provider });
}
