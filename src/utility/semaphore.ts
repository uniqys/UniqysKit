import semaphore from 'semaphore'

export function takeSemaphoreAsync<T> (semaphore: semaphore.Semaphore, task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) =>
    semaphore.take(() => task().finally(semaphore.leave).then(resolve, reject)))
}
