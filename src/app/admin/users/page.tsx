"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Users, UserPlus, Pencil, Trash2, HardDrive, Shield, MoreVertical } from "lucide-react"
import Link from "next/link"
import Header from "@/components/Header"
import ConfirmDialog from "@/components/ConfirmDialog"
import SearchBar from "@/components/SearchBar"
import FilterBar from "@/components/FilterBar"
import Pagination from "@/components/Pagination"
import AdminUserMenu from "@/components/AdminUserMenu"
import { formatSize } from "@/lib/utils"

function bytesToMB(bytes: number) {
  return Math.round(bytes / (1024 * 1024))
}

function MBToBytes(mb: number) {
  return mb * 1024 * 1024
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  
  // Pagination & Filter
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [newName, setNewName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newRole, setNewRole] = useState("USER")
  const [newMaxSizeMB, setNewMaxSizeMB] = useState("500")
  const [error, setError] = useState("")
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
    variant?: "danger" | "warning" | "primary"
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    variant: "danger"
  })

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
    else if (status === "authenticated" && (session?.user as any)?.role !== "ADMIN") router.push("/dashboard")
    else if (status === "authenticated") loadUsers()
  }, [status])

  async function loadUsers() {
    const res = await fetch("/api/admin/users")
    const data = await res.json()
    setUsers(data.users || [])
    setLoading(false)
  }

  function resetFilters() {
    setSearchQuery("")
    setRoleFilter("all")
    setDateFilter("all")
    setCurrentPage(1)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        email: newEmail,
        password: newPassword,
        role: newRole,
        maxSize: MBToBytes(parseInt(newMaxSizeMB) || 500).toString(),
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); return }
    setShowCreate(false)
    setNewName(""); setNewEmail(""); setNewPassword(""); setNewRole("USER"); setNewMaxSizeMB("500")
    loadUsers()
  }

  async function handleUpdate(userId: string, updates: any) {
    await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...updates }),
    })
    loadUsers()
    setEditingUser(null)
  }

  async function handleDelete(userId: string) {
    setConfirmDialog({
      isOpen: true,
      title: "Delete user?",
      message: "Are you sure you want to delete this user? All their files will be deleted too!",
      variant: "danger",
      onConfirm: async () => {
        await fetch("/api/admin/users", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        })
        loadUsers()
      }
    })
  }

  return (
    <div className="min-h-screen">
      <Header title="LinyaShare Admin" showAdminNav={true} adminNavItem="users" showDashboardLink />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold gradient-text flex items-center gap-2">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary-400" /> User Management
          </h1>
          <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center justify-center gap-2">
            <UserPlus className="w-4 h-4" /> {showCreate ? "Close" : "Create user"}
          </button>
        </div>

        {/* Search & Filters */}
        <div className="space-y-3 mb-6">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search users by name or email..."
          />
          <FilterBar
            filters={[
              {
                key: "role",
                label: "Role",
                value: roleFilter,
                options: [
                  { value: "all", label: "All roles" },
                  { value: "USER", label: "User" },
                  { value: "ADMIN", label: "Admin" },
                ],
                onChange: setRoleFilter,
              },
              {
                key: "date",
                label: "Registration date",
                value: dateFilter,
                options: [
                  { value: "all", label: "All dates" },
                  { value: "today", label: "Today" },
                  { value: "week", label: "This week" },
                  { value: "month", label: "This month" },
                ],
                onChange: setDateFilter,
              },
            ]}
            onReset={resetFilters}
            activeCount={
              (searchQuery ? 1 : 0) +
              (roleFilter !== "all" ? 1 : 0) +
              (dateFilter !== "all" ? 1 : 0)
            }
          />
        </div>

        <AnimatePresence>
          {showCreate && (
            <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              onSubmit={handleCreate} className="glass-card p-4 sm:p-6 mb-6 sm:mb-8 space-y-4 overflow-hidden">
              <h2 className="text-base sm:text-lg font-semibold text-white">Create new user</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" className="input-field" required />
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email" className="input-field" required />
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Password" className="input-field" required minLength={8} />
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="input-field">
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <div>
                  <label className="block text-sm text-dark-300 mb-1">Storage limit</label>
                  <div className="flex gap-2 items-center">
                    <input type="number" value={newMaxSizeMB} onChange={(e) => setNewMaxSizeMB(e.target.value)} className="input-field" min={1} />
                    <span className="text-dark-400 shrink-0">MB</span>
                  </div>
                </div>
              </div>
                {error && <p className="text-red-400 text-xs sm:text-sm">{error}</p>}
                <button type="submit" className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"><UserPlus className="w-4 h-4 sm:w-5 sm:h-5" /> Create</button>
            </motion.form>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {editingUser && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              onClick={() => setEditingUser(null)}>
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                className="glass-card p-4 sm:p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2"><Pencil className="w-4 h-4 sm:w-5 sm:h-5 text-primary-400" /> Edit user</h2>
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-sm text-dark-300 mb-1">Name</label>
                    <input type="text" defaultValue={editingUser.name} placeholder="Name"
                      onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-1">Role</label>
                    <select value={editingUser.role} onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })} className="input-field">
                      <option value="USER">User</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-1">Storage limit</label>
                    <div className="flex gap-2 items-center">
                      <input type="number" value={bytesToMB(editingUser.maxSize)} placeholder="Size in MB"
                        onChange={(e) => setEditingUser({ ...editingUser, maxSize: MBToBytes(parseInt(e.target.value) || 500) })} className="input-field" min={1} />
                      <span className="text-dark-400 shrink-0">MB</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <button onClick={() => handleUpdate(editingUser.id, { name: editingUser.name, role: editingUser.role, maxSize: editingUser.maxSize.toString() })} className="btn-primary flex-1 flex items-center justify-center gap-2">
                      <Pencil className="w-4 h-4" /> Save
                    </button>
                    <button onClick={() => setEditingUser(null)} className="btn-secondary flex-1">Cancel</button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex justify-center py-12"><div className="loading-spinner"></div></div>
        ) : (() => {
          // Filter & Sort Users
          const filtered = users.filter((user: any) => {
            const query = searchQuery.toLowerCase()
            const matchesSearch = !query || 
              user.name.toLowerCase().includes(query) || 
              user.email.toLowerCase().includes(query)

            const matchesRole = roleFilter === "all" || user.role === roleFilter

            const matchesDate = (() => {
              if (dateFilter === "all") return true
              const created = new Date(user.createdAt)
              const now = new Date()
              if (dateFilter === "today") {
                return created.toDateString() === now.toDateString()
              } else if (dateFilter === "week") {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                return created >= weekAgo
              } else if (dateFilter === "month") {
                return created.getMonth() === now.getMonth() && 
                       created.getFullYear() === now.getFullYear()
              }
              return true
            })()

            return matchesSearch && matchesRole && matchesDate
          })

          const totalPages = Math.ceil(filtered.length / itemsPerPage)
          const start = (currentPage - 1) * itemsPerPage
          const paginated = filtered.slice(start, start + itemsPerPage)

          return (
            <>
              <div className="space-y-2 sm:space-y-3">
          {paginated.map((user: any) => (
                   <motion.div key={user.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card-hover p-3 sm:p-4">
                     <div className="flex items-center justify-between gap-2 sm:gap-3">
                       <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                           <span className="text-white font-medium text-xs sm:text-sm">{user.name}</span>
                           {user.role === "ADMIN" && <span className="text-xs bg-primary-500/10 text-primary-400 px-1.5 py-0.5 rounded-full flex items-center gap-1"><Shield className="w-3 h-3" /> Admin</span>}
                         </div>
                         <p className="text-dark-400 text-xs mt-1 truncate">{user.email}</p>
                         <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-dark-400">
                           <span>{user._count.files} files</span>
                           <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" /> {formatSize(user.maxSize)}</span>
                           <span className="hidden sm:inline">Since {new Date(user.createdAt).toLocaleDateString("en-US")}</span>
                         </div>
                       </div>
                      {/* Desktop: Show buttons inline */}
                      <div className="hidden md:flex gap-2 shrink-0">
                        <button onClick={() => setEditingUser({ ...user, maxSize: user.maxSize })} className="btn-secondary text-sm py-2 px-3 flex items-center gap-1"><Pencil className="w-4 h-4" /> Edit</button>
                        <button onClick={() => handleDelete(user.id)} className="btn-danger text-sm py-2 px-3"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      {/* Mobile: Show "..." menu */}
                      <div className="md:hidden relative">
                        <AdminUserMenu
                          user={user}
                          onEdit={() => setEditingUser({ ...user, maxSize: user.maxSize })}
                          onDelete={() => handleDelete(user.id)}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filtered.length}
          />
        </>
      )
        })()}
      </main>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Confirm"
        cancelText="Cancel"
        variant={confirmDialog.variant}
      />
    </div>
  )
}
