declare module "midtrans-client" {
  interface CoreApiInstance {
    charge(payload: unknown): Promise<unknown>;
    transaction: {
      status(orderId: string): Promise<unknown>;
    };
  }

  const midtransClient: {
    CoreApi: new (options: {
      isProduction: boolean;
      serverKey: string;
      clientKey: string;
    }) => CoreApiInstance;
  };

  export default midtransClient;
}
