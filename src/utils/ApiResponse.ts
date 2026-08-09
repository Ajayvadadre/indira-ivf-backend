export class ApiResponse {
  static success<T>(message: string, data?: T) {
    return {
      success: true,
      message,
      data,
    };
  }

  static error<T>(message: string, errors?: T) {
    return {
      success: false,
      message,
      errors,
    };
  }
}
