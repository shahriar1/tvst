/** True when we can safely show prompts and spinners. */
export function isInteractive(): boolean {
  return (
    process.stdin.isTTY === true &&
    process.stdout.isTTY === true &&
    !process.env.CI &&
    !process.env.TVST_NON_INTERACTIVE
  );
}
