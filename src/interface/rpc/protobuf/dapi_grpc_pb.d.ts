// TODO: auto generate this
// It is manually maintained, yet.

import * as grpc from "grpc";
import * as dapi_pb from "./dapi_pb";

interface DappServiceImplementation extends grpc.UntypedServiceImplementation {
  connect: grpc.handleUnaryCall<dapi_pb.Empty, dapi_pb.AppState>
  execute: grpc.handleUnaryCall<dapi_pb.ExecuteRequest, dapi_pb.AppState>
}

interface DappService extends grpc.ServiceDefinition<DappServiceImplementation> {
  connect: grpc.MethodDefinition<dapi_pb.Empty, dapi_pb.AppState>
  execute: grpc.MethodDefinition<dapi_pb.ExecuteRequest, dapi_pb.AppState>
}

interface DappClient {
  connect: ClientTypes.UnaryRequestMethod<dapi_pb.Empty, dapi_pb.AppState>
  execute: ClientTypes.UnaryRequestMethod<dapi_pb.ExecuteRequest, dapi_pb.AppState>
}

declare function hoge(a: string): string
declare function hoge(b: number): number

export const DappService: DappService
export class DappClient extends grpc.Client implements DappClient { }

interface CoreServiceImplementation extends grpc.UntypedServiceImplementation {
  sendTransaction: grpc.handleUnaryCall<dapi_pb.Transaction, dapi_pb.Empty>
}
interface CoreService extends grpc.ServiceDefinition<CoreServiceImplementation> {
  sendTransaction: grpc.MethodDefinition<dapi_pb.Transaction, dapi_pb.Empty>;
}

interface CoreClient {
  sendTransaction: ClientTypes.UnaryRequestMethod<dapi_pb.Transaction, dapi_pb.Empty>
}

export const CoreService: CoreService
export class CoreClient extends grpc.Client implements CoreClient { }


// shorthand
declare namespace ClientTypes {
  // (null) or ()
  type Callback<Response> = ((error: grpc.ServiceError | null, value: Response) => void)
  type UnaryRequestMethod<Request, Response> =
    ((request: Request, callback: Callback<Response>) => grpc.ClientUnaryCall) &
    ((request: Request, metadata: grpc.Metadata, callback: Callback<Response>) => grpc.ClientUnaryCall) &
    ((request: Request, options: Partial<grpc.CallOptions>, callback: Callback<Response>) => grpc.ClientUnaryCall) &
    ((request: Request, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: Callback<Response>) => grpc.ClientUnaryCall)
  type ClientStreamRequestMethod<Request, Response> =
    ((callback: Callback<Response>) => grpc.ClientWritableStream<Request>) &
    ((metadata: grpc.Metadata, callback: Callback<Response>) => grpc.ClientWritableStream<Request>) &
    ((options: Partial<grpc.CallOptions>, callback: Callback<Response>) => grpc.ClientWritableStream<Request>) &
    ((metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: Callback<Response>) => grpc.ClientWritableStream<Request>)
  type ServerStreamRequestMethod<Request, Response> =
    ((request: Request) => grpc.ClientReadableStream<Response>) &
    ((request: Request, metadata: grpc.Metadata) => grpc.ClientReadableStream<Response>) &
    ((request: Request, options: Partial<grpc.CallOptions>) => grpc.ClientReadableStream<Response>) &
    ((request: Request, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>) => grpc.ClientReadableStream<Response>)
  type BidiStreamRequestMethod<Request, Response> =
    (() => grpc.ClientDuplexStream<Request, Response>) &
    ((metadata: grpc.Metadata) => grpc.ClientDuplexStream<Request, Response>) &
    ((options: Partial<grpc.CallOptions>) => grpc.ClientDuplexStream<Request, Response>) &
    ((metadata: grpc.Metadata, options: Partial<grpc.CallOptions>) => grpc.ClientDuplexStream<Request, Response>)
}
