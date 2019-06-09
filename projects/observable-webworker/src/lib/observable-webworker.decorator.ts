import { fromEvent, Notification } from 'rxjs';
import { dematerialize, map, materialize } from 'rxjs/operators';
import { DoWork, GenericWorkerMessage, WorkerMessageNotification } from './observable-webworker.types';

export type ObservableWorkerConstructor<I = any, O = any> = new (...args) => DoWork<I, O>;

export type WebworkerPostMessageNotification<T> = (
  message: Notification<GenericWorkerMessage<T>>,
  tranferables?: Transferable[],
) => void;

export function ObservableWebWorker() {
  return <I, O>(workerConstructor: ObservableWorkerConstructor<I, O>): void => {
    const input$ = fromEvent(self, 'message').pipe(
      map((e: WorkerMessageNotification<I>): Notification<GenericWorkerMessage<I>> => e.data),
      map((n: Notification<GenericWorkerMessage<I>>) => new Notification(n.kind, n.value, n.error)),
      dematerialize(),
    );

    new workerConstructor()
      .work(input$)
      .pipe(materialize())
      .subscribe((notification: Notification<GenericWorkerMessage<O>>) => {
        const transferables = notification.hasValue ? notification.value.transferables : undefined;
        // type to workaround typescript trying to compile as non-webworker context
        ((postMessage as unknown) as WebworkerPostMessageNotification<O>)(notification, transferables);
      });
  };
}