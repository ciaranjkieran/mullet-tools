"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useSubscription } from "@shared/api/hooks/auth/useSubscription";
import { useCreateCheckoutSession } from "@shared/api/hooks/billing/useCreateCheckoutSession";
import { useLogout } from "@shared/api/hooks/auth/useLogout";
import { useRouter } from "next/navigation";

export default function Paywall() {
  const { isExpired, isLoading } = useSubscription();
  const checkout = useCreateCheckoutSession();
  const logout = useLogout();
  const router = useRouter();

  const shouldShow = !isLoading && isExpired;

  if (!shouldShow) return null;

  async function handleLogout() {
    try {
      await logout.mutateAsync();
    } catch {
      // Session may already be expired — still navigate to login
    }
    router.replace("/login");
  }

  return (
    <Dialog.Root open={true}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
            bg-white rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 max-w-md w-full z-50 text-center"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <Dialog.Title className="text-2xl font-bold text-gray-900 mb-2">
            Your trial has ended
          </Dialog.Title>
          <Dialog.Description className="text-gray-600 mb-6">
            Subscribe to Mullet to keep building with Modes, Goals, Projects, and
            everything you have set up. Your data is safe and waiting.
          </Dialog.Description>

          <div className="space-y-3">
            <button
              onClick={() => checkout.mutate()}
              disabled={checkout.isPending}
              className="w-full rounded-lg bg-blue-700 px-6 py-3 text-base font-semibold text-white hover:bg-blue-800 transition disabled:opacity-50"
            >
              {checkout.isPending ? "Loading..." : "Subscribe now"}
            </button>

            {checkout.isError && (
              <p className="mt-2 text-sm text-red-600 text-center">
                Something went wrong. Please try again.
              </p>
            )}

            <button
              onClick={handleLogout}
              className="w-full rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              Log out
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
