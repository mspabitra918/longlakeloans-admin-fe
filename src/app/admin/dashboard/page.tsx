"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAdminAuth, useAdminApi } from "@/lib/admin-auth";
import Image from "next/image";
import { SITE_NAME } from "@/lib/constants";
import { formatDateTime } from "@/lib/datetime";

interface Stats {
  total: number;
  pending: number;
  reviewing: number;
  approved: number;
  declined: number;
  funded: number;
  bank_verification_failed: number;
  totalLoanAmount: number;
  averageLoanAmount: number;
}

interface RecentApp {
  application_id: string;
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  loan_amount: number;
  status: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  reviewing: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  funded: "bg-purple-100 text-purple-800",
  bank_verification_failed: "bg-red-100 text-red-800",
  bank_verification_in_progress: "bg-indigo-100 text-indigo-800",
  deposit_in_progress: "bg-yellow-100 text-yellow-800",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: string | null) {
  if (!date) return "N/A";
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminDashboard() {
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user, loading, logout } = useAdminAuth();
  const { adminFetch } = useAdminApi();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentApps, setRecentApps] = useState<RecentApp[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/admin");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;

    Promise.all([
      adminFetch("/api/admin/stats").then((r) => r.json()),
      adminFetch(
        "/api/admin/applications?limit=5&sortBy=created_at&sortOrder=desc",
      ).then((r) => r.json()),
    ])
      .then(([statsData, appsData]) => {
        setStats(statsData.stats);
        setRecentApps(appsData.applications || []);
      })
      .catch(console.error)
      .finally(() => setDataLoading(false));
  }, [user, adminFetch]);

  const handleAddEmployee = async () => {
    if (!name) {
      alert("Name is required");
      return;
    }

    try {
      setIsLoading(true);

      const res = await fetch("/api/admin/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // If using auth token:
          // "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();

      if (data.success) {
        alert("Employee added successfully!");
        setName("");
        setIsAddingEmployee(false);
      } else {
        alert(data.error || "Something went wrong");
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <Link
            href="/admin/dashboard"
            className="text-xl font-bold text-primary"
          >
            {/* <Image
              src="/logo-dark.png"
              alt={SITE_NAME}
              width={160}
              height={40}
              priority
            /> */}
            <span className=" font-extrabold tracking-tight text-[#1b4d3e] text-3xl">
              Oakhill<span className="text-[#0f3329] font-normal"> Loans</span>
            </span>
          </Link>
          <div className="hidden sm:flex items-center gap-4 text-sm">
            <Link href="/admin/dashboard" className="text-primary font-medium">
              Dashboard
            </Link>
            <Link
              href="/admin/applications"
              className="text-gray-600 hover:text-primary transition"
            >
              Applications
            </Link>
            <Link
              href="/admin/message"
              className="text-gray-600 hover:text-primary transition"
            >
              Message
            </Link>
            <Link
              href="/admin/user"
              className="text-gray-600 hover:text-primary transition"
            >
              User
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
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
          {/* {user.role === "admin" && (
            <button
              onClick={() => setIsAddingEmployee(true)}
              className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-full text-sm font-medium transition cursor-pointer"
            >
              Add Employee
            </button>
          )} */}
        </div>

        {dataLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-8">
              {[
                {
                  label: "Total",
                  value: stats?.total ?? 0,
                  color: "bg-gray-100",
                },
                {
                  label: " Bank Verification Pending",
                  value: stats?.pending ?? 0,
                  color: "bg-yellow-50",
                },
                {
                  label: "Reviewing",
                  value: stats?.reviewing ?? 0,
                  color: "bg-blue-50",
                },
                {
                  label: "Bank Verification Completed",
                  value: stats?.approved ?? 0,
                  color: "bg-green-50",
                },
                {
                  label: "Declined",
                  value: stats?.declined ?? 0,
                  color: "bg-red-50",
                },
                {
                  label: "Funded",
                  value: stats?.funded ?? 0,
                  color: "bg-purple-50",
                },
                {
                  label: "Bank Verification Failed",
                  value: stats?.bank_verification_failed ?? 0,
                  color: "bg-red-50",
                },
              ].map((s) => (
                <div key={s.label} className={`${s.color} rounded-xl p-4`}>
                  <p className="text-sm text-gray-500">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-sm text-gray-500">Total Loan Amount</p>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(stats?.totalLoanAmount ?? 0)}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-sm text-gray-500">Average Loan Amount</p>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(stats?.averageLoanAmount ?? 0)}
                </p>
              </div>
            </div>

            {/* Recent Applications */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Recent Applications
                </h2>
                <Link
                  href="/admin/applications"
                  className="text-sm text-primary hover:underline"
                >
                  View All
                </Link>
              </div>
              {recentApps.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  No applications yet
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                        <th className="px-6 py-3">Applicant ID</th>
                        <th className="px-6 py-3">Applicant</th>
                        <th className="px-6 py-3">Amount</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentApps.map((app) => (
                        <tr
                          key={app.application_id}
                          className="border-b border-gray-50 hover:bg-gray-50"
                        >
                          <td className="px-6 py-4 font-medium">
                            {app?.application_id}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">
                              {app.first_name} {app.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {app.email}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-medium">
                            {formatCurrency(app.loan_amount)}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[app.status] || ""}`}
                            >
                              {app.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {formatDateTime(app.created_at)}
                          </td>
                          <td className="px-6 py-4">
                            <Link
                              href={`/admin/applications/${app.application_id}`}
                              className="text-primary text-sm hover:underline"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
        {isAddingEmployee && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
              <h2 className="text-xl font-bold mb-4">Add Employee</h2>

              {/* Input */}
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter employee name"
                className="border p-2 w-full rounded mb-4"
              />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter employee email"
                className="border p-2 w-full rounded mb-4"
              />
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter employee password"
                className="border p-2 w-full rounded mb-4"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="border p-2 w-full rounded mb-4"
              >
                <option value="">Select Role</option>
                <option value="admin">Admin</option>
                <option value="reviewer">Reviewer</option>
              </select>

              {/* Buttons */}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsAddingEmployee(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>

                <button
                  onClick={handleAddEmployee}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg"
                >
                  {loading ? "Adding..." : "Add"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
