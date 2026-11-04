"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { useAdminAuth, useAdminApi } from "@/lib/admin-auth";
import { LuRefreshCcw } from "react-icons/lu";
import { CiCirclePlus } from "react-icons/ci";
import { FaEyeSlash, FaRegEye } from "react-icons/fa";
import { FaDeleteLeft } from "react-icons/fa6";
import { FiDelete } from "react-icons/fi";
import { formatDateTime } from "@/lib/datetime";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  is_active: boolean;
}

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800",
  reviewer: "bg-blue-100 text-blue-800",
  viewer: "bg-gray-100 text-gray-800",
};

const ROLES = ["all", "admin", "reviewer"];

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

export default function UsersListPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <UsersListContent />
    </Suspense>
  );
}

function UsersListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { user, loading, logout } = useAdminAuth();
  const { adminFetch } = useAdminApi();

  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [role, setRole] = useState(searchParams.get("role") || "all");
  const [search, setSearch] = useState(
    searchParams.get("search")?.trim() || "",
  );
  const [searchInput, setSearchInput] = useState(
    searchParams.get("search")?.trim() || "",
  );
  const [dataLoading, setDataLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [addMember, setAddMember] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleInput, setRoleInput] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Sync URL with state
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (role !== "all") params.set("role", role);
    if (search) params.set("search", search);

    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    router.replace(url, { scroll: false });
  }, [page, role, search, pathname, router]);

  const handleReset = () => {
    setIsResetting(true);
    setPage(1);
    setRole("all");
    setSearch("");
    setSearchInput("");

    setTimeout(() => {
      setIsResetting(false);
    }, 1000);
  };

  useEffect(() => {
    if (!loading && !user) router.replace("/admin");
  }, [loading, user, router]);

  const fetchUsers = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);

    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
    });
    if (role !== "all") params.set("role", role);
    if (search) params.set("search", search);

    try {
      const res = await adminFetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setDataLoading(false);
    }
  }, [user, page, role, search, adminFetch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

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
        body: JSON.stringify({ name, email, password, role: roleInput }),
      });

      const data = await res.json();

      if (data.success) {
        alert("Employee added successfully!");
        setName("");
      } else {
        alert(data.error || "Something went wrong");
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    } finally {
      setIsLoading(false);
      fetchUsers();
      setAddMember(false);
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    if (!confirm("Are you sure you want to deactivate this user?")) return;

    try {
      const res = await adminFetch(`/api/admin/users/${userId}/deactivate`, {
        method: "PUT",
      });
      const data = await res.json();

      if (data.success) {
        alert("User deactivated successfully!");
        fetchUsers();
      } else {
        alert(data.error || "Something went wrong");
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  const handleActivateUser = async (userId: string) => {
    if (!confirm("Are you sure you want to activate this user?")) return;

    try {
      const res = await adminFetch(`/api/admin/users/${userId}/activate`, {
        method: "PUT",
      });
      const data = await res.json();

      if (data.success) {
        alert("User activated successfully!");
        fetchUsers();
      } else {
        alert(data.error || "Something went wrong");
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
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
            <Link href="/admin/user" className="text-primary font-medium">
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Users{" "}
            <span className="text-gray-400 text-lg font-normal">({total})</span>
          </h1>

          {/* Search */}
          <div className="flex items-center gap-2 flex-wrap">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Search by name or email"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none w-64"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark transition cursor-pointer"
              >
                Search
              </button>
            </form>
            {user.role === "admin" && (
              <button
                onClick={() => setAddMember(true)}
                className="px-4 py-2 text-primary border border-primary rounded-lg text-sm transition hover:bg-primary/5 cursor-pointer flex items-center justify-center"
              >
                <CiCirclePlus size={21} />
              </button>
            )}

            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 text-primary border border-primary rounded-lg text-sm transition hover:bg-primary/5 cursor-pointer flex items-center justify-center"
            >
              <LuRefreshCcw
                size={20}
                className={`${isResetting ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 hidden md:block">Role:</span>
            <div className="flex gap-1 flex-wrap">
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRole(r);
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                    role === r
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {r === "all" ? "All" : r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {dataLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                    <th className="px-6 py-3">ID</th>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3">Joined Date</th>
                    {user?.role === "admin" && (
                      <th className="px-6 py-3">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4 font-medium text-xs text-gray-500">
                        {u.id}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {u.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {u.email}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[u.role] || "bg-gray-100 text-gray-800"}`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDateTime(u.created_at)}
                      </td>
                      {user?.role === "admin" && (
                        <td className="px-6 py-4">
                          <button
                            onClick={() =>
                              u?.is_active
                                ? handleDeactivateUser(u.id)
                                : handleActivateUser(u.id)
                            }
                            className={`text-sm hover:underline ${
                              u?.is_active ? "text-red-500" : "text-green-600"
                            }`}
                          >
                            {u?.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition cursor-pointer"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
        {addMember && (
          <div className="fixed inset-0 flex items-center justify-center z-[100] bg-black/60">
            <div className="bg-white p-6 rounded-lg min-w-md">
              <h2 className="text-lg font-bold mb-4">Add New User</h2>
              {/* Form fields for name, email, role, password */}

              <form onSubmit={handleAddEmployee}>
                <div className="grid gap-4">
                  <div>
                    {/* <label htmlFor="name">Full Name</label> */}
                    <input
                      className="border border-gray-400 w-full py-2.5 px-3 rounded-md outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                      placeholder="Pabitra Ghara"
                      type="text"
                      name="name"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    {/* <label htmlFor="email">Email</label> */}
                    <input
                      className="border border-gray-400 w-full py-2.5 px-3 rounded-md outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                      placeholder="xyz@gmail.com"
                      type="text"
                      name="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    {/* <label htmlFor="password">Password</label> */}
                    <input
                      placeholder="dcbddsc3@"
                      type={showPassword ? "text" : "password"}
                      className="border border-gray-400 w-full py-2.5 px-3 pr-10 rounded-md"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaRegEye />}
                    </button>
                  </div>
                  <div>
                    {/* <label htmlFor="role">Role</label> */}
                    <select
                      className="border border-gray-400 w-full py-2.5 px-3 rounded-md outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                      name="role"
                      id="role"
                      value={roleInput}
                      onChange={(e) => setRoleInput(e.target.value)}
                    >
                      <option value="">Select Role</option>
                      <option value="admin">Admin</option>
                      <option value="reviewer">Reviewer</option>
                      {/* <option value="viewer">Viewer</option> */}
                    </select>
                  </div>
                </div>
              </form>

              <div className="flex gap-4">
                <button
                  onClick={() => setAddMember(false)}
                  className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddEmployee}
                  disabled={isLoading}
                  className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700 mx-auto" />
                  ) : (
                    "Add User"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
