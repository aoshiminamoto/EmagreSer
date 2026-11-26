export interface ServerMessages {
  subject: string
  body: (url: string) => string
}
