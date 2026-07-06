/**
 * File: lock.gs
 */
function withLock(fn) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(180000); // 180 seconds
    fn();
  } catch (e) {
    throw new Error("Could not acquire lock. Please try again later. " + e.toString());
  } finally {
    lock.releaseLock();
  }
}
