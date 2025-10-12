declare module 'smoothscroll-polyfill' {
  interface SmoothScrollPolyfill {
    polyfill(): void;
  }

  const smoothscroll: SmoothScrollPolyfill;
  export default smoothscroll;
}
