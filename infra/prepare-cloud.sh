#!/usr/bin/env bash
# Operator-run provisioning checklist. Never executed by CI or ChatGPT.
set -euo pipefail
: "${GOOGLE_CLOUD_PROJECT:?Set explicit GOOGLE_CLOUD_PROJECT for AfrodizzyActs}"
: "${CONFIRM_BILLABLE_SETUP:?Set CONFIRM_BILLABLE_SETUP=YES after approval}"
if [[ "${CONFIRM_BILLABLE_SETUP}" != YES ]]; then
  echo "Operator confirmation is required; no changes made" >&2; exit 1
fi
REGION="${GCP_REGION:-africa-south1}"
if [[ "${REGION}" != africa-south1 ]]; then
  echo "Choose a region deliberately, considering POPIA and pricing"; exit 1
fi
gcloud projects describe "${GOOGLE_CLOUD_PROJECT}" >/dev/null
echo "Check billing is linked and R650 planning alerts are configured in Cloud Billing."
gcloud services enable \
  run.googleapis.com \
  firestore.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  identitytoolkit.googleapis.com \
  secretmanager.googleapis.com \
  --project "${GOOGLE_CLOUD_PROJECT}"
if ! gcloud firestore databases describe --database='(default)' --project "${GOOGLE_CLOUD_PROJECT}" >/dev/null 2>&1; then
  gcloud firestore databases create \
    --database='(default)' --location="${REGION}" \
    --edition=standard --type=firestore-native --delete-protection \
    --project "${GOOGLE_CLOUD_PROJECT}"
fi
if ! gcloud artifacts repositories describe dizzyops \
  --location "${REGION}" --project "${GOOGLE_CLOUD_PROJECT}" >/dev/null 2>&1; then
  gcloud artifacts repositories create dizzyops --repository-format=docker \
    --location="${REGION}" --project="${GOOGLE_CLOUD_PROJECT}"
fi
ACCOUNT="dizzyops-runtime@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com"
if ! gcloud iam service-accounts describe "${ACCOUNT}" --project "${GOOGLE_CLOUD_PROJECT}" >/dev/null 2>&1; then
  gcloud iam service-accounts create dizzyops-runtime --project="${GOOGLE_CLOUD_PROJECT}" \
    --display-name="DizzyOps restricted Cloud Run runtime"
fi
gcloud projects add-iam-policy-binding "${GOOGLE_CLOUD_PROJECT}" \
 --member="serviceAccount:${ACCOUNT}" --role="roles/datastore.user" >/dev/null
echo "Prepared Firestore, Artifact Registry and scoped runtime account; database is empty."
echo "NEXT: Admin must configure the Identity Platform SAML provider, DNS, Firebase authorized domain,"
echo "Secret Manager STAFF_ROLE_MAP_JSON, the Firestore indexes, and Cloud Run deploy credentials."
echo "Do not activate BUSINESS_API_ENABLED or IDENTITY_PLATFORM_ENABLED before security validation."
