export {};

declare global {
  type TencentCaptchaResult = {
    ret: number;
    ticket?: string;
    randstr?: string;
    CaptchaAppId?: string;
    bizState?: unknown;
    errorCode?: number;
    errorMessage?: string;
  };

  type TencentCaptchaOptions = {
    type?: "Popup" | "Embed";
    enableDarkMode?: boolean | "force";
    userLanguage?: string;
    bizState?: unknown;
    needFeedBack?: string | boolean;
    enableAutoCheck?: boolean;
  };

  type TencentCaptchaInstance = {
    show: () => void;
    destroy: () => void;
    reload: () => void;
    getTicket: () => { CaptchaAppId: string; ticket: string } | null;
  };

  interface Window {
    TencentCaptcha?: new (
      container: HTMLElement,
      captchaAppId: string,
      callback: (result: TencentCaptchaResult) => void,
      options?: TencentCaptchaOptions,
    ) => TencentCaptchaInstance;
  }
}
