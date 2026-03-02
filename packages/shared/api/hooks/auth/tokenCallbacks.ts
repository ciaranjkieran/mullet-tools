// Injectable callbacks for mobile token persistence.
// Mobile app sets these at boot; web never touches them.

let _onTokenReceived: ((token: string) => Promise<void>) | null = null;
let _onTokenCleared: (() => Promise<void>) | null = null;

export function setOnTokenReceived(cb: (token: string) => Promise<void>) {
  _onTokenReceived = cb;
}

export function setOnTokenCleared(cb: () => Promise<void>) {
  _onTokenCleared = cb;
}

export async function handleTokenReceived(token: string) {
  if (_onTokenReceived) await _onTokenReceived(token);
}

export async function handleTokenCleared() {
  if (_onTokenCleared) await _onTokenCleared();
}
