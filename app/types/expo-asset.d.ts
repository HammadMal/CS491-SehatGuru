declare module "expo-asset" {
  export class Asset {
    static fromModule(moduleId: number): Asset;
    downloadAsync(): Promise<void>;
    localUri?: string;
    uri: string;
  }
}
