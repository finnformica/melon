# Deploying

The frontend deploys itself: Netlify builds `main` and publishes `dist/`.

**Firestore Security Rules do not.** They live in `firestore.rules` but only
take effect once they are pushed to the Firebase project. A rules change that
is merged but not deployed shows up in the app as
`Missing or insufficient permissions.` on an action that looks correct in the
code — this has bitten us once already (the NPC-replacement rule sat in the
repo undeployed while the feature shipped).

## Automatic (preferred)

`.github/workflows/firestore-rules.yml` deploys `firestore.rules`,
`firestore.indexes.json` and `storage.rules` on every push to `main` that
touches them. It needs two repository secrets:

| Secret                     | Where to get it                                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `FIREBASE_PROJECT_ID`      | Firebase Console → Project settings → Project ID                                                                                      |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Console → Project settings → Service accounts → *Generate new private key*. Paste the whole JSON file as the secret value.  |

The service account needs the **Firebase Rules Admin** and **Cloud Datastore
Index Admin** roles (the default "Firebase Admin SDK" service account already
has them).

Run it by hand any time from the Actions tab → *Deploy Firestore rules* → *Run
workflow*.

## Manual

From a laptop:

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules --project <project-id>
```

From a phone: Firebase Console → **Firestore Database** → **Rules** tab →
paste the contents of `firestore.rules` → **Publish**.

## Testing rules before deploying

The rules are exercised against the Firestore emulator, which needs Java:

```bash
npx firebase-tools emulators:exec --only firestore --project demo-melon "node your-test.mjs"
```

using `@firebase/rules-unit-testing` to build the same batch the client sends.
