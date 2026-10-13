import test from "node:test";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
} from "firebase/auth";
test("Google credential signs into parent Auth emulator with stable account UID across independent clients", async () => {
  const apps = [
    initializeApp(
      { apiKey: "demo-key", projectId: "demo-tiny-siege" },
      "deviceA",
    ),
    initializeApp(
      { apiKey: "demo-key", projectId: "demo-tiny-siege" },
      "deviceB",
    ),
  ];
  const auths = apps.map((app) => {
    const auth = getAuth(app);
    connectAuthEmulator(auth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    return auth;
  });
  const credential = () =>
    GoogleAuthProvider.credential(
      JSON.stringify({
        sub: "parent-auth-test",
        email: "parent-auth@example.test",
        email_verified: true,
      }),
    );
  const [a, b] = await Promise.all(
    auths.map((auth) => signInWithCredential(auth, credential())),
  );
  assert.equal(a.user.uid, b.user.uid);
  assert.equal(a.user.providerData[0].providerId, "google.com");
  await signOut(auths[0]);
  assert.equal(auths[0].currentUser, null);
  assert.equal(auths[1].currentUser.uid, b.user.uid);
  await Promise.all(apps.map((app) => deleteApp(app)));
});
