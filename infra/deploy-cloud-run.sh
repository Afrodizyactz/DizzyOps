#!/usr/bin/env bash
# Explicit manual deployment only; requires prior admin setup and billable-service approval.
set -euo pipefail
: "${GOOGLE_CLOUD_PROJECT:?Set project ID}"
: "${CONFIRM_BILLABLE_SETUP:?Set CONFIRM_BILLABLE_SETUP=YES after admin approval}"
[[ "${CONFIRM_BILLABLE_SETUP}" == YES ]] || { echo "Not approved" >&2; exit 1; }
REGION="${GCP_REGION:-africa-south1}"
IMAGE="${REGION}-docker.pkg.dev/${GOOGLE_CLOUD_PROJECT}/dizzyops/dizzyops-api"
: "${IMAGE_TAG:?Set an immutable commit/image tag}"
: "${FIREBASE_API_KEY:?Firebase public web API key required}"
: "${FIREBASE_AUTH_DOMAIN:?Verified Firebase auth domain required}"
: "${FIREBASE_APP_ID:?Firebase web app ID required}"
: "${PUBLIC_ORIGIN:?Verified HTTPS portal origin required}"
[[ "${PUBLIC_ORIGIN}" == "https://ops.afrodizzyacts.co.za" ]] || { echo "Origin must match approved portal" >&2; exit 1; }
[[ "${IMAGE_TAG}" =~ ^[a-zA-Z0-9_.-]+$ ]] || exit 1
RUN_AS="dizzyops-runtime@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com"
echo "Deploying image tag ${IMAGE_TAG}; activation flags default to false."
gcloud run deploy dizzyops-api \
  --project "${GOOGLE_CLOUD_PROJECT}" --region "${REGION}" \
  --image "${IMAGE}:${IMAGE_TAG}" \
  --service-account "${RUN_AS}" \
  --min-instances 0 --max-instances 3 --concurrency 20 \
  --memory 512Mi --cpu 1 \
  --allow-unauthenticated \
  --set-env-vars "PUBLIC_ORIGIN=${PUBLIC_ORIGIN},SAML_PROVIDER_ID=saml.afrodizzyacts,GOOGLE_CLOUD_PROJECT=${GOOGLE_CLOUD_PROJECT},FIRESTORE_DATABASE_ID=(default),IDENTITY_PLATFORM_ENABLED=${IDENTITY_PLATFORM_ENABLED:-false},BUSINESS_API_ENABLED=${BUSINESS_API_ENABLED:-false},FIREBASE_API_KEY=${FIREBASE_API_KEY},FIREBASE_AUTH_DOMAIN=${FIREBASE_AUTH_DOMAIN},FIREBASE_APP_ID=${FIREBASE_APP_ID}" \
  --set-secrets "STAFF_ROLE_MAP_JSON=dizzyops-staff-role-map:latest"
echo "A successful deploy is NOT SAML activation confirmation. Test custom-domain sign-in before enabling users."
