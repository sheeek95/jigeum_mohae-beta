export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const notFound = (what: string) => new HttpError(404, `${what}을(를) 찾을 수 없어요`);
export const forbidden = (msg = '권한이 없어요') => new HttpError(403, msg);
export const badRequest = (msg: string) => new HttpError(400, msg);
export const unauthorized = (msg = '로그인이 필요해요') => new HttpError(401, msg);
