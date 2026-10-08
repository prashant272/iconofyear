import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  fetchAdminNominations,
  updateNominationStatus,
  updateNomination,
  deleteNomination,
  fetchAdminInquiries,
  deleteAdminInquiry,
  fetchSubAdmins,
  createSubAdmin,
  updateSubAdmin,
  deleteSubAdmin,
  assignNomination,
} from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  ShieldCheck,
  Edit2,
  Trash2,
  FileText,
  Search,
  Eye,
  X,
  UserPlus,
  Key,
  Copy,
  Check,
  Users as UsersIcon,
  RefreshCw,
  Lock,
} from "lucide-react";
import AdminPreviousEditions from "../components/AdminPreviousEditions.jsx";
import AdminUpcomingEditions from "../components/AdminUpcomingEditions.jsx";
import AdminGallery from "../components/AdminGallery.jsx";
import { PageHero } from "../components/Motion.jsx";

/* ------------------ Tab Permissions Config ------------------ */
export const MANAGEABLE_TABS = [
  { id: "nominations", label: "Nominations", icon: "🏆", desc: "View & manage assigned nominations" },
  { id: "status", label: "Payment", icon: "💸", desc: "Payment workflows & transaction statuses" },
  { id: "analytics", label: "Analytics", icon: "📊", desc: "Performance metrics & conversion charts" },
  { id: "users", label: "Users", icon: "👤", desc: "Nominee contacts & registered profiles" },
  { id: "gallery", label: "Gallery", icon: "🖼️", desc: "Photo gallery & media assets" },
  { id: "inquiries", label: "Inquiries", icon: "📧", desc: "Contact inquiries & summit leads" },
  { id: "previous-editions", label: "Editions", icon: "🕰️", desc: "Past summit archives & winners" },
  { id: "upcoming-editions", label: "Upcoming", icon: "🚀", desc: "Upcoming summit editions & schedules" },
];

export const ALL_SIDEBAR_TABS = [
  ...MANAGEABLE_TABS,
  { id: "admins", label: "Settings", icon: "🛡️", desc: "Sub-admin delegation & team registry" },
];

/* ------------------ Constants ------------------ */
const amberGrad = "linear-gradient(135deg, #4338CA 0%, #06b6d4 100%)";
const cyanGrad = "linear-gradient(135deg, #06b6d4 0%, #4338CA 100%)";

const STATUS_OPTIONS = [
  { value: "nominated", label: "Nomination Received" },
  { value: "evaluation", label: "Under Evaluation" },
  { value: "in_progress", label: "In Progress (Shortlisted)" },
  { value: "selected", label: "Selected (Winner)" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  ...STATUS_OPTIONS,
];

const PARTICIPATION_TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All Participation Types" },
  { value: "nominated as award", label: "Award Nomination" },
  { value: "attend as speaker", label: "Speaker" },
  { value: "attend as exhibitor", label: "Exhibitor" },
  { value: "attend as sponsor", label: "Sponsor" },
  { value: "attend as ramp show", label: "Ramp Show" },
  { value: "attend as special guest", label: "Special Guest" },
  { value: "award + ramp show", label: "Award + Ramp Show" },
];

const EVENT_FILTER_OPTIONS = [
  { value: "all", label: "All Events" },
  { value: "icon of the year award", label: "Icon of the Year Award" },
  { value: "women icon of the year", label: "Women Icon of the Year" },
];

const LOCATION_FILTER_OPTIONS = [
  { value: "all", label: "All Event Locations" },
  { value: "delhi", label: "Delhi" },
  { value: "Dubai", label: "Dubai" },
  { value: "London", label: "London" },
  { value: "USA", label: "USA" },
  { value: "Mumbai", label: "Mumbai" },
  { value: "Hyderabad", label: "Hyderabad" },
];

/* ------------------ Status Badge ------------------ */
function StatusBadge({ status }) {
  const normalized = status || "nominated";
  const label = STATUS_OPTIONS.find((s) => s.value === normalized)?.label || "Nomination Received";

  const colorClasses = {
    nominated: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    evaluation: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    in_progress: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    selected: "bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-[0_0_20px_rgba(251,113,133,0.4)]",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  }[normalized] || "bg-white/5 text-white/40 border-white/10";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest  transition-all ${colorClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${normalized === 'selected' ? 'bg-white' : 'bg-current'} ${normalized !== 'rejected' ? 'animate-pulse' : ''}`} />
      {label}
    </span>
  );
}

function DetailItem({ label, val, isLink, color = "text-white" }) {
  if (!val) return null;
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      {isLink ? (
        <a href={val} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-indigo-400 hover:text-indigo-300 hover:underline break-all">
          {val}
        </a>
      ) : (
        <p className={`text-sm font-bold leading-relaxed ${color}`}>{val}</p>
      )}
    </div>
  );
}

const PAYMENT_STATUS_OPTIONS = [
  { value: "not_paid", label: "Not Paid" },
  { value: "initial_paid", label: "Initial Payment" },
  { value: "paid", label: "Paid (Completed)" },
  { value: "not_interested", label: "Not Interested" },
];

/* ================== MAIN COMPONENT ================== */
export default function AdminDashboard() {
  const { user, token } = useAuth();
  const isSuperAdmin = user?.role === "admin";
  const isSubAdmin = user?.role === "subadmin";

  const visibleTabs = useMemo(() => {
    if (isSuperAdmin) {
      return ALL_SIDEBAR_TABS;
    }
    if (isSubAdmin) {
      const allowed = Array.isArray(user?.allowedTabs) ? user.allowedTabs : [];
      // Only include tabs explicitly enabled by Super Admin (nominations can also be unchecked)
      return MANAGEABLE_TABS.filter((tab) => allowed.includes(tab.id));
    }
    return ALL_SIDEBAR_TABS;
  }, [isSuperAdmin, isSubAdmin, user?.allowedTabs]);

  const [activeTab, setActiveTab] = useState("nominations");

  // Keep activeTab synchronized with visibleTabs
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some((t) => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [visibleTabs, activeTab]);

  const [nominations, setNominations] = useState([]);
  const [filteredNominations, setFilteredNominations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [participationTypeFilter, setParticipationTypeFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("newest"); // 'newest' or 'oldest'
  const [updatingId, setUpdatingId] = useState(null);
  const [assigningId, setAssigningId] = useState(null);

  const [editingNomination, setEditingNomination] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [viewingNomination, setViewingNomination] = useState(null);

  const [inquiries, setInquiries] = useState([]);
  const [loadingInquiries, setLoadingInquiries] = useState(false);
  const [inquiriesError, setInquiriesError] = useState("");

  /* ------------------ Sub-Admin Registry & Permissions State ------------------ */
  const [subadmins, setSubadmins] = useState([]);
  const [loadingSubadmins, setLoadingSubadmins] = useState(false);
  const [subadminError, setSubadminError] = useState("");

  const [subAdminModalOpen, setSubAdminModalOpen] = useState(false);
  const [editingSubAdmin, setEditingSubAdmin] = useState(null);
  const [subAdminForm, setSubAdminForm] = useState({
    name: "",
    email: "",
    password: "",
    allowedTabs: ["nominations"],
  });
  const [savingSubAdmin, setSavingSubAdmin] = useState(false);
  const [subAdminFormError, setSubAdminFormError] = useState("");

  // One-click Copy Generated Credentials Modal
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  const generateRandomPassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  };

  const loadSubadmins = async () => {
    if (!isSuperAdmin || !token) return;
    setLoadingSubadmins(true);
    setSubadminError("");
    try {
      const data = await fetchSubAdmins(token);
      setSubadmins(data);
    } catch (err) {
      setSubadminError(err.message || "Failed to load sub-admins");
    } finally {
      setLoadingSubadmins(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin && token) {
      loadSubadmins();
    }
  }, [isSuperAdmin, token]);

  const handleAssignNomination = async (nominationId, assignedToId) => {
    try {
      setAssigningId(nominationId);
      const res = await assignNomination(nominationId, assignedToId || null, token);
      const updated = res.nomination || res;
      setNominations((prev) =>
        prev.map((n) =>
          n._id === nominationId ? { ...n, assignedTo: updated.assignedTo } : n
        )
      );
      loadSubadmins();
    } catch (err) {
      alert(err.message || "Failed to assign nomination");
    } finally {
      setAssigningId(null);
    }
  };

  const handleOpenCreateSubAdmin = () => {
    setEditingSubAdmin(null);
    setSubAdminForm({
      name: "",
      email: "",
      password: generateRandomPassword(),
      allowedTabs: ["nominations"], // Nominations can also be unchecked
    });
    setSubAdminFormError("");
    setSubAdminModalOpen(true);
  };

  const handleOpenEditSubAdmin = (subadmin) => {
    setEditingSubAdmin(subadmin);
    setSubAdminForm({
      name: subadmin.name || "",
      email: subadmin.email || "",
      password: "",
      allowedTabs: Array.isArray(subadmin.allowedTabs) ? [...subadmin.allowedTabs] : [],
    });
    setSubAdminFormError("");
    setSubAdminModalOpen(true);
  };

  const handleToggleTabPermission = (tabId) => {
    setSubAdminForm((prev) => {
      const exists = prev.allowedTabs.includes(tabId);
      return {
        ...prev,
        allowedTabs: exists
          ? prev.allowedTabs.filter((id) => id !== tabId)
          : [...prev.allowedTabs, tabId],
      };
    });
  };

  const handleSelectAllTabs = () => {
    setSubAdminForm((prev) => ({
      ...prev,
      allowedTabs: MANAGEABLE_TABS.map((t) => t.id),
    }));
  };

  const handleClearAllTabs = () => {
    setSubAdminForm((prev) => ({
      ...prev,
      allowedTabs: [],
    }));
  };

  const handleSaveSubAdmin = async (e) => {
    e.preventDefault();
    setSubAdminFormError("");

    if (!subAdminForm.name.trim()) {
      setSubAdminFormError("Team member name is required");
      return;
    }
    if (!editingSubAdmin && !subAdminForm.email.trim()) {
      setSubAdminFormError("Team member email is required");
      return;
    }

    setSavingSubAdmin(true);
    try {
      if (editingSubAdmin) {
        const payload = {
          name: subAdminForm.name.trim(),
          allowedTabs: subAdminForm.allowedTabs,
        };
        if (subAdminForm.password.trim()) {
          payload.password = subAdminForm.password.trim();
        }
        await updateSubAdmin(editingSubAdmin._id, payload, token);
        setSubAdminModalOpen(false);
        loadSubadmins();
      } else {
        const payload = {
          name: subAdminForm.name.trim(),
          email: subAdminForm.email.trim(),
          password: subAdminForm.password.trim(),
          allowedTabs: subAdminForm.allowedTabs,
        };
        const res = await createSubAdmin(payload, token);
        setSubAdminModalOpen(false);
        loadSubadmins();
        setCreatedCredentials({
          name: payload.name,
          email: payload.email,
          password: res.generatedPassword || payload.password,
          allowedTabs: payload.allowedTabs,
        });
        setCopiedCredentials(false);
      }
    } catch (err) {
      setSubAdminFormError(err.message || "Failed to save team member");
    } finally {
      setSavingSubAdmin(false);
    }
  };

  const handleDeleteSubAdmin = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete team member "${name}"? Their assigned nominations will become unassigned.`)) {
      try {
        await deleteSubAdmin(id, token);
        setSubadmins((prev) => prev.filter((s) => s._id !== id));
        const refreshed = await fetchAdminNominations(token);
        setNominations(refreshed);
      } catch (err) {
        alert(err.message || "Failed to delete team member");
      }
    }
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const loginUrl = `${window.location.origin}/admin/login`;
    const tabLabels = createdCredentials.allowedTabs
      .map((tId) => MANAGEABLE_TABS.find((t) => t.id === tId)?.label || tId)
      .join(", ") || "None";

    const textToCopy = `ICON OF THE YEAR - TEAM MEMBER CREDENTIALS\n` +
      `----------------------------------------\n` +
      `Name: ${createdCredentials.name}\n` +
      `Login URL: ${loginUrl}\n` +
      `Email: ${createdCredentials.email}\n` +
      `Password: ${createdCredentials.password}\n` +
      `Assigned Modules: ${tabLabels}\n` +
      `----------------------------------------\n` +
      `Please login at ${loginUrl} to access your assigned workspace.`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedCredentials(true);
      setTimeout(() => setCopiedCredentials(false), 3000);
    });
  };

  /* ------------------ Load Inquiries Data ------------------ */
  useEffect(() => {
    if (activeTab === "inquiries" && token) {
      const loadInquiries = async () => {
        setLoadingInquiries(true);
        setInquiriesError("");
        try {
          const data = await fetchAdminInquiries(token);
          setInquiries(data);
        } catch (err) {
          setInquiriesError(err.message || "Failed to load inquiries");
        } finally {
          setLoadingInquiries(false);
        }
      };
      loadInquiries();
    }
  }, [activeTab, token]);

  const handleDeleteInquiry = async (id) => {
    if (window.confirm("Are you sure you want to delete this inquiry?")) {
      try {
        await deleteAdminInquiry(id, token);
        setInquiries(prev => prev.filter((inq) => inq._id !== id));
      } catch (err) {
        alert(err.message || "Failed to delete inquiry");
      }
    }
  };

  const filteredInquiries = useMemo(() => {
    let result = [...inquiries];
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      result = result.filter(
        (inq) =>
          inq.name?.toLowerCase().includes(s) ||
          inq.phone?.toLowerCase().includes(s) ||
          inq.inquiryType?.toLowerCase().includes(s) ||
          inq.purpose?.toLowerCase().includes(s)
      );
    }
    return result;
  }, [inquiries, searchTerm]);

  /* ------------------ Load Data ------------------ */
  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchAdminNominations(token);
        setNominations(data);
      } catch (err) {
        setError(err.message || "Failed to load nominations");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  /* ------------------ Filter ------------------ */
  useEffect(() => {
    let filtered = [...nominations];

    if (statusFilter !== "all") {
      filtered = filtered.filter((n) => (n.status || "nominated") === statusFilter);
    }

    if (eventFilter !== "all") {
      filtered = filtered.filter((n) => {
        const norm = (n.nominationType || "icon of the year award").toLowerCase();
        if (eventFilter === "women icon of the year") {
          return norm.includes("women");
        }
        return !norm.includes("women");
      });
    }

    if (participationTypeFilter !== "all") {
      filtered = filtered.filter((n) => n.participationType === participationTypeFilter);
    }

    if (locationFilter !== "all") {
      const filterLower = locationFilter.toLowerCase();
      filtered = filtered.filter((n) => {
        const locString = Array.isArray(n.preferredLocation)
          ? n.preferredLocation.join(' ')
          : n.preferredLocation || '';
        return locString.toLowerCase().includes(filterLower);
      });
    }

    if (isSuperAdmin && assigneeFilter !== "all") {
      if (assigneeFilter === "unassigned") {
        filtered = filtered.filter((n) => !n.assignedTo);
      } else {
        filtered = filtered.filter((n) => {
          const aId = typeof n.assignedTo === "object" ? n.assignedTo?._id : n.assignedTo;
          return aId === assigneeFilter;
        });
      }
    }

    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter((n) => {
        const nameMatch = n.nomineeName?.toLowerCase().includes(s);
        const emailMatch = n.email?.toLowerCase().includes(s);
        const mobileMatch = (n.mobileNumber || n.phone || n.mobile || n.contactMobile)?.toLowerCase().includes(s);
        const orgMatch = n.organization?.toLowerCase().includes(s);
        const cityMatch = n.city?.toLowerCase().includes(s);
        const stateMatch = n.state?.toLowerCase().includes(s);
        const locationMatch = (Array.isArray(n.preferredLocation)
          ? n.preferredLocation.join(' ')
          : n.preferredLocation
        )?.toLowerCase().includes(s);
        return nameMatch || emailMatch || mobileMatch || orgMatch || cityMatch || stateMatch || locationMatch;
      });
    }

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    setFilteredNominations(filtered);
  }, [nominations, statusFilter, eventFilter, participationTypeFilter, locationFilter, assigneeFilter, isSuperAdmin, searchTerm, sortOrder]);

  const paymentSummary = useMemo(() => {
    const summary = {
      total: filteredNominations.length,
      not_paid: 0,
      initial_paid: 0,
      paid: 0,
      not_interested: 0,
    };
    filteredNominations.forEach((n) => {
      const key = n.paymentStatus || "not_paid";
      if (summary[key] != null) summary[key] += 1;
    });
    return summary;
  }, [filteredNominations]);

  const dailySummary = useMemo(() => {
    const groups = {};
    filteredNominations.forEach((n) => {
      const dateKey = n.createdAt
        ? new Date(n.createdAt).toLocaleDateString("en-GB")
        : "Unknown Date";

      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: dateKey,
          total: 0,
          paid: 0,
          pending: 0,
          initial_paid: 0,
        };
      }
      groups[dateKey].total += 1;
      const status = n.paymentStatus || "not_paid";
      if (status === "paid") groups[dateKey].paid += 1;
      else if (status === "initial_paid") groups[dateKey].initial_paid += 1;
      else groups[dateKey].pending += 1;
    });

    // Sort by date descending
    return Object.values(groups).sort((a, b) => {
      if (a.date === "Unknown Date") return 1;
      if (b.date === "Unknown Date") return -1;
      const dateA = new Date(a.date.split("/").reverse().join("-"));
      const dateB = new Date(b.date.split("/").reverse().join("-"));
      return dateB - dateA;
    });
  }, [filteredNominations]);

  /* ------------------ Status Change ------------------ */
  const handleStatusChange = async (id, status) => {
    try {
      setUpdatingId(id);
      const updated = await updateNominationStatus(id, status, token);
      setNominations((prev) =>
        prev.map((n) => (n._id === id ? { ...n, ...updated } : n))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  /* ------------------ Edit ------------------ */
  const handleEdit = (n) => {
    setEditingNomination(n);
    setEditForm({ ...n });
  };

  const handleSaveEdit = async () => {
    try {
      setUpdatingId(editingNomination._id);

      // Clean Mongoose internal and immutable fields from payload
      const { _id, __v, createdAt, updatedAt, user, ...cleanPayload } = editForm;

      const updated = await updateNomination(
        editingNomination._id,
        cleanPayload,
        token
      );
      setNominations((prev) =>
        prev.map((n) => (n._id === updated._id ? updated : n))
      );
      setEditingNomination(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  /* ------------------ Delete ------------------ */
  const handleDelete = async () => {
    try {
      setUpdatingId(deleteConfirmId);
      await deleteNomination(deleteConfirmId, token);
      setNominations((prev) =>
        prev.filter((n) => n._id !== deleteConfirmId)
      );
      setDeleteConfirmId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const inputClass =
    "w-full bg-[#030919] border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:bg-[#071126] transition-all font-semibold";

  /* ================== HELPERS ================== */
  const renderNominationsTable = () => (
    <div className="relative group/table">
      <div className="overflow-x-auto max-h-[75vh] medical-scrollbar rounded-[2rem] border border-white/10 bg-slate-900 shadow-2xl overflow-y-auto">
        <table className="min-w-[1600px] w-full text-left border-separate border-spacing-0">
          <thead>
            <tr className="sticky top-0 z-40">
              {[
                { label: "Assigned Team Member", width: "220px" },
                { label: "Event / Summit", width: "190px" },
                { label: "Participation", width: "180px" },
                { label: "Category", width: "250px" },
                { label: "Direct Contact", width: "180px" },
                { label: "Nominee Entity", width: "280px" },
                { label: "Workflow Status", width: "200px" },
                { label: "Revenue Status", width: "180px" },
                { label: "Valuation", width: "120px" },
                { label: "Leadership", width: "220px" },
                { label: "Primary Contact", width: "220px" },
                { label: "Business Node", width: "220px" },
                { label: "Geography", width: "180px" },
                { label: "Public Remarks", width: "200px" },
                { label: "Internal Notes", width: "200px" },
                { label: "Source Identity", width: "220px" },
                { label: "Timestamp", width: "180px" }
              ].map((th, i) => (
                <th key={i} className="px-4 py-3 bg-[#020817] border-b border-white/10 first:rounded-tl-[2rem]" style={{ width: th.width }}>
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-200">{th.label}</span>
                </th>
              ))}
              <th className="px-4 py-3 sticky right-0 z-50 bg-[#020817] border-b border-white/10 rounded-tr-[2rem] text-right">
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-400">Control Node</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {filteredNominations.map((n, idx) => (
              <tr key={n._id} className="group/row hover:bg-slate-800/60 transition-colors duration-300">
                {/* 1. Assigned Team Member (First Column) */}
                <td className="px-4 py-2.5">
                  {isSuperAdmin ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${n.assignedTo ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'bg-slate-500'}`} />
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-200 truncate max-w-[180px]">
                          {n.assignedTo
                            ? typeof n.assignedTo === "object"
                              ? n.assignedTo.name
                              : subadmins.find((s) => s._id === n.assignedTo)?.name || "Assigned"
                            : "Unassigned"}
                        </span>
                      </div>
                      <select
                        value={
                          typeof n.assignedTo === "object"
                            ? n.assignedTo?._id || ""
                            : n.assignedTo || ""
                        }
                        disabled={assigningId === n._id}
                        onChange={(e) => handleAssignNomination(n._id, e.target.value)}
                        className="w-full bg-[#050c1e] border border-white/20 rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300 focus:outline-none focus:border-cyan-400 transition-all appearance-none cursor-pointer disabled:opacity-50"
                      >
                        <option value="" className="bg-[#0f172a] text-slate-300">-- Unassigned --</option>
                        {subadmins.map((s) => (
                          <option key={s._id} value={s._id} className="bg-[#0f172a] text-white">
                            👤 {s.name} ({s.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-black uppercase tracking-widest">
                      <span>👤</span>
                      <span>Assigned to You</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${
                    (n.nominationType || "").toLowerCase().includes("women")
                      ? "bg-pink-500/10 border-pink-500/30 text-pink-300 font-bold"
                      : "bg-[#d4af37]/10 border-[#d4af37]/30 text-[#d4af37] font-bold"
                  }`}>
                    <span className="text-sm">{(n.nominationType || "").toLowerCase().includes("women") ? "👑" : "🏆"}</span>
                    {(n.nominationType || "").toLowerCase().includes("women") ? "Women Icon" : "Icon of the Year"}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${
                    n.participationType === "nominated as award" ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300" :
                    n.participationType === "attend as speaker" ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-300" :
                    n.participationType === "attend as exhibitor" ? "bg-purple-500/15 border-purple-500/30 text-purple-300" :
                    n.participationType === "attend as sponsor" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" :
                    n.participationType === "attend as ramp show" ? "bg-rose-500/15 border-rose-500/30 text-rose-300" :
                    n.participationType === "attend as special guest" ? "bg-amber-500/15 border-amber-500/30 text-amber-300" :
                    n.participationType === "award + ramp show" ? "bg-fuchsia-500/15 border-fuchsia-500/30 text-fuchsia-300" :
                    "bg-pink-500/15 border-pink-500/30 text-pink-300"
                  }`}>
                    <span className="text-sm">{
                      n.participationType === "nominated as award" ? "🏆" :
                      n.participationType === "attend as speaker" ? "🎤" :
                      n.participationType === "attend as exhibitor" ? "🏢" :
                      n.participationType === "attend as sponsor" ? "💎" :
                      n.participationType === "attend as ramp show" ? "💃" :
                      n.participationType === "attend as special guest" ? "🌟" :
                      n.participationType === "award + ramp show" ? "🏆💃" : "📝"
                    }</span>
                    {
                      n.participationType === "nominated as award" ? "Award" :
                      n.participationType === "attend as speaker" ? "Speaker" :
                      n.participationType === "attend as exhibitor" ? "Exhibitor" :
                      n.participationType === "attend as sponsor" ? "Sponsor" :
                      n.participationType === "attend as ramp show" ? "Ramp Show" :
                      n.participationType === "attend as special guest" ? "Special Guest" :
                      n.participationType === "award + ramp show" ? "Award + Ramp Show" :
                      n.participationType
                    }
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  {n.participationType === "nominated as award" ? (
                    <div className="space-y-1">
                      {n.field && <div className="text-[10px] font-black text-[#d4af37] uppercase tracking-widest">{n.field}</div>}
                      <div className="text-sm font-black text-white leading-tight uppercase tracking-tight">{n.assignedCategory || n.category}</div>
                      <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{n.subCategory}</div>
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">General Access</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-col gap-0.5">
                    {[n.mobile, n.contactMobile, n.orgHeadMobile].filter(Boolean).slice(0, 2).map((phone, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] font-mono font-bold text-cyan-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        {phone}
                      </div>
                    ))}
                    {![n.mobile, n.contactMobile, n.orgHeadMobile].some(Boolean) && <span className="text-slate-500 font-bold">—</span>}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="space-y-1">
                    <div className="text-sm font-black text-white uppercase tracking-tighter">{n.nomineeName}</div>
                    <div className="text-[11px] font-bold text-indigo-300 uppercase tracking-widest truncate max-w-[240px]">
                      {n.organization}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="space-y-1.5">
                    <StatusBadge status={n.status} />
                    <select
                      value={n.status || "nominated"}
                      onChange={(e) => handleStatusChange(n._id, e.target.value)}
                      className="w-full bg-[#050c1e] border border-white/20 rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-100 focus:outline-none focus:border-indigo-400 transition-all appearance-none cursor-pointer"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value} className="bg-[#0f172a] text-white">{s.label}</option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="space-y-1.5">
                    <div className={`text-[10px] font-black uppercase tracking-widest ${n.paymentStatus === 'paid' ? 'text-indigo-300' : 'text-slate-300'}`}>
                      {PAYMENT_STATUS_OPTIONS.find(s => s.value === (n.paymentStatus || 'not_paid'))?.label}
                    </div>
                    <select
                      value={n.paymentStatus || "not_paid"}
                      onChange={(e) =>
                        setNominations((prev) =>
                          prev.map((row) =>
                            row._id === n._id ? { ...row, paymentStatus: e.target.value } : row
                          )
                        )
                      }
                      onBlur={() => updateNomination(n._id, { paymentStatus: n.paymentStatus }, token)}
                      className="w-full bg-[#050c1e] border border-white/20 rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-100 focus:outline-none focus:border-cyan-400 transition-all appearance-none cursor-pointer"
                    >
                      {PAYMENT_STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value} className="bg-[#0f172a] text-white">{s.label}</option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="text-sm font-black text-white">{n.amount || "—"}</div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-white">{n.orgHeadName || "—"}</div>
                    <div className="text-[10px] font-medium font-mono text-slate-300 truncate">{n.orgHeadEmail}</div>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-white">{n.contactName || "—"}</div>
                    <div className="text-[10px] font-medium font-mono text-slate-300 truncate">{n.contactEmail}</div>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold text-slate-200 truncate max-w-[200px]">{n.website || "No Website"}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-300">TO: {n.turnover || "—"}</div>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="text-[11px] font-bold text-slate-200">{n.city}, {n.state}</div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="text-[11px] text-slate-200 font-medium line-clamp-2 max-w-[200px] leading-relaxed">{n.remarks || "—"}</div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="text-[11px] text-cyan-300 font-semibold line-clamp-2 max-w-[200px] leading-relaxed italic">
                    {n.adminRemark || "No Internal Notes"}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="text-[11px] font-bold text-indigo-300 font-mono">{n.user?.email}</div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                    {new Date(n.createdAt).toLocaleDateString()}
                    <br />
                    <span className="text-slate-400">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 sticky right-0 z-30 bg-[#020817]/95  border-l border-white/5 rounded-br-[2rem] text-right">
                  <div className="flex items-center justify-end gap-2">
                    {n.pdfUrl && (
                      <a
                        href={n.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all shadow-lg shadow-indigo-500/10"
                        title="Dossier PDF"
                      >
                        <FileText size={14} />
                      </a>
                    )}
                    <button
                      onClick={() => setViewingNomination(n)}
                      className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 hover:bg-cyan-500 hover:text-white transition-all shadow-lg shadow-cyan-500/10"
                      title="Insight View"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => handleEdit(n)}
                      className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-all"
                      title="Modify"
                    >
                      <Edit2 size={14} />
                    </button>
                    {isSuperAdmin && (
                      <button
                        onClick={() => setDeleteConfirmId(n._id)}
                        className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all"
                        title="Purge"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="absolute top-0 right-[110px] bottom-0 w-12 bg-gradient-to-l from-[#020817] to-transparent pointer-events-none z-20" />
    </div>
  );

  const renderStatusTab = () => (
    <div className="overflow-x-auto max-h-[75vh] medical-scrollbar rounded-[2rem] border border-white/10 bg-slate-900 shadow-2xl overflow-y-auto">
      <table className="min-w-[1100px] w-full text-left border-separate border-spacing-0">
        <thead>
          <tr className="sticky top-0 z-40">
            {[
              { label: "Nominee Entity", width: "300px" },
              { label: "Communication", width: "200px" },
              { label: "Digital Endpoint", width: "250px" },
              { label: "Workflow Logic", width: "250px" },
              { label: "Revenue Node", width: "200px" },
              { label: "Valuation", width: "150px" },
              { label: "Internal Notes", width: "250px" }
            ].map((th, i) => (
              <th key={i} className="px-4 py-3 bg-[#020817] border-b border-white/10 first:rounded-tl-[2rem] last:rounded-tr-[2rem]" style={{ width: th.width }}>
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-200">{th.label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {filteredNominations.map((n, idx) => {
            const userLabel = n.status === "in_progress" ? "Shortlisted" : STATUS_OPTIONS.find((s) => s.value === n.status)?.label || "Nomination Received";
            return (
              <tr key={n._id} className="group hover:bg-slate-800/60 transition-colors duration-300">
                <td className="px-4 py-2.5">
                  <div className="text-sm font-black text-white uppercase tracking-tighter">{n.nomineeName}</div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="text-[11px] font-mono font-bold text-cyan-300 italic">{n.contactMobile || n.orgHeadMobile || "—"}</div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="text-[11px] font-medium font-mono text-slate-200 lowercase truncate">{n.user?.email || n.contactEmail || "—"}</div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">{userLabel}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <div className={`text-[10px] font-black uppercase tracking-widest ${n.paymentStatus === 'paid' ? 'text-indigo-300' : 'text-slate-300'}`}>
                    {PAYMENT_STATUS_OPTIONS.find((s) => s.value === (n.paymentStatus || "not_paid"))?.label || "Not Paid"}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="text-sm font-black text-white">{n.amount || "—"}</div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="text-[11px] text-slate-300 italic max-w-[200px] line-clamp-1">{n.adminRemark || "—"}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderUsersTab = () => {
    const byUser = new Map();
    filteredNominations.forEach((n) => {
      if (!n.user?.email) return;
      const key = n.user.email;
      const existing = byUser.get(key) || {
        email: n.user.email,
        count: 0,
        latestStatus: n.status,
        latestAt: n.createdAt,
      };
      existing.count += 1;
      if (!existing.latestAt || new Date(n.createdAt) > new Date(existing.latestAt)) {
        existing.latestAt = n.createdAt;
        existing.latestStatus = n.status;
      }
      byUser.set(key, existing);
    });
    const rows = Array.from(byUser.values());

    return (
      <div className="overflow-x-auto max-h-[75vh] medical-scrollbar rounded-[2rem] border border-white/10 bg-slate-900 shadow-2xl overflow-y-auto">
        <table className="min-w-[800px] w-full text-left border-separate border-spacing-0">
          <thead>
            <tr className="sticky top-0 z-40">
              {[
                { label: "User Identification", width: "40%" },
                { label: "Nomination Depth", width: "20%" },
                { label: "Operational Status", width: "20%" },
                { label: "Last Sync", width: "20%" }
              ].map((th, i) => (
                <th key={i} className="px-4 py-3 bg-[#020817] border-b border-white/10 first:rounded-tl-[2rem] last:rounded-tr-[2rem]">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-200">{th.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.map((row, idx) => (
              <tr key={row.email} className="group hover:bg-slate-800/60 transition-colors duration-300">
                <td className="px-4 py-2.5">
                  <div className="text-sm font-black text-white uppercase tracking-widest">{row.email}</div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-black">
                    {row.count} Records
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={row.latestStatus} />
                </td>
                <td className="px-4 py-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    {row.latestAt ? new Date(row.latestAt).toLocaleString() : "—"}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderAdminsTab = () => {
    const assignedNominationsCount = nominations.filter((n) => Boolean(n.assignedTo)).length;
    const unassignedNominationsCount = nominations.filter((n) => !n.assignedTo).length;

    return (
      <div className="space-y-8">
        {/* Top Header Card */}
        <div className="border border-indigo-500/20 rounded-[2.5rem] bg-slate-900 p-8 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-8xl pointer-events-none">🛡️</div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="text-indigo-400" size={24} />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400">Team Delegation Node</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
                Team Member <span className="text-gradient-prestige">Registry</span>
              </h2>
              <p className="mt-2 text-slate-200 text-xs font-medium leading-relaxed max-w-2xl">
                Create team member credentials and delegate specific tab permissions. Team members can only access the tabs enabled for them, and within Nominations, they only see items specifically assigned to them.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadSubadmins}
                disabled={loadingSubadmins}
                className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-slate-200 hover:text-white hover:bg-white/20 transition-all"
                title="Refresh Registry"
              >
                <RefreshCw size={16} className={loadingSubadmins ? "animate-spin text-cyan-400" : ""} />
              </button>
              <button
                onClick={handleOpenCreateSubAdmin}
                className="btn-primary flex items-center gap-2 px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-[0_0_30px_rgba(67,56,202,0.4)]"
              >
                <UserPlus size={16} />
                <span>Add Team Member</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/10">
            <div className="p-4 rounded-2xl bg-[#020817] border border-white/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1">Active Team Members</p>
              <p className="text-3xl font-black text-white tabular-nums">{subadmins.length}</p>
            </div>
            <div className="p-4 rounded-2xl bg-[#020817] border border-white/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-cyan-300 mb-1">Delegated Nominations</p>
              <p className="text-3xl font-black text-cyan-300 tabular-nums">{assignedNominationsCount}</p>
            </div>
            <div className="p-4 rounded-2xl bg-[#020817] border border-white/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-300 mb-1">Unassigned Queue</p>
              <p className="text-3xl font-black text-amber-300 tabular-nums">{unassignedNominationsCount}</p>
            </div>
          </div>
        </div>

        {/* Error message */}
        {subadminError && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
            {subadminError}
          </div>
        )}

        {/* Team Members List */}
        {loadingSubadmins && subadmins.length === 0 ? (
          <div className="min-h-[30vh] flex flex-col items-center justify-center text-indigo-100">
            <div className="w-10 h-10 border-4 border-white/20 border-t-indigo-400 rounded-full animate-spin mb-3" />
            <p className="text-xs font-bold tracking-widest uppercase animate-pulse text-indigo-300">Loading Team Members...</p>
          </div>
        ) : subadmins.length === 0 ? (
          <div className="border border-white/10 rounded-[2.5rem] bg-slate-900 p-12 text-center shadow-xl">
            <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto mb-4 text-2xl">
              👤
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">No Team Members Created Yet</h3>
            <p className="text-xs text-slate-300 max-w-md mx-auto mb-6">
              Create your first team member to delegate nomination management and dashboard privileges.
            </p>
            <button
              onClick={handleOpenCreateSubAdmin}
              className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest"
            >
              <UserPlus size={15} />
              <span>Create First Team Member</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[2.5rem] border border-white/10 bg-slate-900 shadow-2xl overflow-y-auto medical-scrollbar">
            <table className="min-w-[1000px] w-full text-left border-separate border-spacing-0">
              <thead>
                <tr>
                  {[
                    { label: "Team Member Entity", width: "26%" },
                    { label: "Permitted Modules (Tabs)", width: "38%" },
                    { label: "Assigned Nominations", width: "16%" },
                    { label: "Created Date", width: "12%" },
                    { label: "Actions", width: "8%" },
                  ].map((th, i) => (
                    <th key={i} className="px-6 py-4 bg-[#020817] border-b border-white/10 first:rounded-tl-[2.5rem] last:rounded-tr-[2.5rem]" style={{ width: th.width }}>
                      <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-200">{th.label}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {subadmins.map((sub) => {
                  const allowed = Array.isArray(sub.allowedTabs) ? sub.allowedTabs : [];
                  return (
                    <tr key={sub._id} className="group hover:bg-slate-800/60 transition-colors duration-300">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-white/20 flex items-center justify-center text-sm font-black text-white">
                            {sub.name ? sub.name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div>
                            <div className="text-sm font-black text-white uppercase tracking-tight">{sub.name}</div>
                            <div className="text-[11px] font-mono font-bold text-cyan-300">{sub.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {allowed.length === 0 ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                              ⚠️ No tabs permitted
                            </span>
                          ) : (
                            allowed.map((tabId) => {
                              const tabDef = MANAGEABLE_TABS.find((t) => t.id === tabId);
                              return (
                                <span
                                  key={tabId}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 text-[10px] font-black uppercase tracking-wider"
                                >
                                  <span>{tabDef?.icon || "📁"}</span>
                                  <span>{tabDef?.label || tabId}</span>
                                </span>
                              );
                            })
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 text-xs font-black">
                          <span>🏆</span>
                          <span>{sub.assignedCount || 0} Assigned</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                          {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : "—"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditSubAdmin(sub)}
                            className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-slate-200 hover:text-white hover:bg-indigo-500 hover:border-indigo-500 transition-all"
                            title="Edit Team Member"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteSubAdmin(sub._id, sub.name)}
                            className="w-8 h-8 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all"
                            title="Delete Team Member"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderInquiriesTab = () => {
    if (loadingInquiries) {
      return (
        <div className="min-h-[40vh] flex flex-col items-center justify-center text-indigo-100">
          <div className="w-10 h-10 border-4 border-white/20 border-t-indigo-400 rounded-full animate-spin mb-3" />
          <p className="text-xs font-bold tracking-widest uppercase animate-pulse text-indigo-300">Loading Inquiries...</p>
        </div>
      );
    }

    if (inquiriesError) {
      return (
        <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-2xl text-center text-red-400 text-sm font-bold">
          {inquiriesError}
        </div>
      );
    }

    if (filteredInquiries.length === 0) {
      return (
        <div className="border border-white/10 rounded-[2rem] bg-slate-900 p-12 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">
          🔍 No Inquiries/Leads Detected
        </div>
      );
    }

    return (
      <div className="overflow-x-auto max-h-[75vh] medical-scrollbar rounded-[2rem] border border-white/10 bg-slate-900 shadow-2xl overflow-y-auto">
        <table className="min-w-[900px] w-full text-left border-separate border-spacing-0">
          <thead>
            <tr className="sticky top-0 z-40">
              {[
                { label: "Full Name", width: "25%" },
                { label: "WhatsApp Number", width: "20%" },
                { label: "Inquiry Type", width: "20%" },
                { label: "Purpose / Details", width: "20%" },
                { label: "Verified At", width: "10%" },
                { label: "Actions", width: "5%" }
              ].map((th, i) => (
                <th key={i} className="px-5 py-3.5 bg-[#020817] border-b border-white/10 first:rounded-tl-[2rem] last:rounded-tr-[2rem]" style={{ width: th.width }}>
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-200">{th.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {filteredInquiries.map((inq) => (
              <tr key={inq._id} className="group hover:bg-slate-800/40 transition-colors duration-300">
                <td className="px-5 py-3.5">
                  <div className="text-sm font-black text-white uppercase tracking-widest">{inq.name}</div>
                </td>
                <td className="px-5 py-3.5">
                  <a
                    href={`https://wa.me/${inq.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-mono font-bold text-cyan-300 hover:text-cyan-200 transition-colors flex items-center gap-1.5"
                  >
                    💬 +{inq.phone.replace(/\D/g, "")}
                  </a>
                </td>
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest">
                    {inq.inquiryType}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="text-xs text-slate-200 font-medium line-clamp-2 max-w-[250px] leading-relaxed">
                    {inq.purpose || "—"}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                    {new Date(inq.updatedAt).toLocaleDateString()}
                    <br />
                    {new Date(inq.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    onClick={() => handleDeleteInquiry(inq._id)}
                    className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all duration-300"
                    title="Delete Lead"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderAnalyticsTab = () => (
    <div className="space-y-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Active Pipelines", val: paymentSummary.total, color: "indigo", icon: "💎" },
          { label: "Secured Revenue", val: paymentSummary.paid, color: "cyan", icon: "📈" },
          { label: "Partial Deposits", val: paymentSummary.initial_paid, color: "purple", icon: "⏳" },
          { label: "Pending Liquidity", val: paymentSummary.not_paid, color: "pink", icon: "⚠️" }
        ].map((stat, i) => (
          <div key={i} className="group relative">
            <div className={`absolute inset-0 bg-${stat.color}-500/10 blur-[80px] rounded-[2.5rem] transition-all group-hover:bg-${stat.color}-500/20`} />
            <div className="relative bg-slate-900 border border-white/10 rounded-[2.5rem] p-10 flex flex-col items-center text-center transition-all group-hover:-translate-y-2 group-hover:border-white/20 shadow-2xl ">
              <div className="text-4xl mb-6 group-hover:scale-110 transition-transform">{stat.icon}</div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 mb-2">{stat.label}</div>
              <div className={`text-5xl font-black text-${stat.color}-400 tabular-nums tracking-tighter`}>{stat.val}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="relative">
        <div className="absolute -inset-4 bg-indigo-500/5 blur-[100px] rounded-full opacity-50" />
        <div className="relative overflow-x-auto border border-white/5 rounded-[3rem] bg-slate-900  shadow-2xl">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr>
                {["Registration Node", "Daily Throughput", "Completed", "Partial", "Pending"].map((th, i) => (
                  <th key={i} className="px-4 py-2.5 bg-[#020817]/40 border-b border-white/5">
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-200">{th}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {dailySummary.map((row, idx) => (
                <tr key={row.date} className="group hover:bg-slate-800/40 transition-colors duration-300">
                  <td className="px-4 py-2.5">
                    <div className="text-sm font-black text-indigo-400 uppercase tracking-widest">{row.date}</div>
                  </td>
                  <td className="px-4 py-2.5 font-black text-xl text-white">{row.total}</td>
                  <td className="px-4 py-2.5">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest">
                      {row.paid} Secured
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase tracking-widest">
                      {row.initial_paid} Partial
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest">
                      {row.pending} Pending
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  /* ================== MEMOIZED RENDERERS ================== */
  const memoizedNominationsTable = useMemo(() => renderNominationsTable(), [filteredNominations, subadmins, assigningId]);
  const memoizedStatusTab = useMemo(() => renderStatusTab(), [filteredNominations]);
  const memoizedAnalyticsTab = useMemo(() => renderAnalyticsTab(), [dailySummary, paymentSummary]);
  const memoizedUsersTab = useMemo(() => renderUsersTab(), [filteredNominations]);
  const memoizedAdminsTab = useMemo(() => renderAdminsTab(), [subadmins, loadingSubadmins, subadminError, nominations]);

  /* ================== UI ================== */
  return (

    <>
      <div className="flex h-[100dvh] w-full bg-[var(--base-bg)] text-white overflow-hidden font-body relative">
        {/* Background Elements */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden" style={{ isolation: "isolate" }}>
          <div className="bg-cross-pattern absolute inset-0 opacity-50" />
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3" />
        </div>

        {/* Sidebar Navigation Container */}
        <aside className="relative z-20 w-53 flex flex-col bg-[#050A15]/80 backdrop-blur-2xl border-r border-white/5 shadow-[20px_0_40px_rgba(0,0,0,0.5)]">
          {/* Sidebar Branding & Status Profile */}
          <div className="pt-14 border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-xl group">
                <ShieldCheck size={24} className="group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-white leading-tight truncate max-w-[130px]">{user?.name || "Admin"}</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isSuperAdmin ? 'bg-indigo-400' : 'bg-cyan-400'} animate-pulse`} />
                  <p className="text-[8px] text-slate-300 font-black uppercase tracking-widest">{isSuperAdmin ? "Super Admin" : "Team Member"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Navigation Tabs Routing List (Filtered by visibleTabs) */}
          <nav className="flex-1 px-4 py-8 overflow-y-auto medical-scrollbar flex flex-col gap-2">
            {visibleTabs.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 w-full group
                ${activeTab === item.id
                    ? "bg-indigo-500 text-[#020817] shadow-[0_0_30px_rgba(67,56,202,0.4)] translate-x-1"
                    : "text-slate-300 hover:text-white hover:bg-white/10 hover:translate-x-1"
                  }
              `}
              >
                <span className="text-lg group-hover:scale-125 transition-transform">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Sidebar Bottom System Metric Counters */}
          <div className="px-4 border-t border-white/5 bg-black/20 flex flex-col">
            <div>
              <p className="text-[9px] text-slate-300 uppercase font-black tracking-widest mb-1">Total Database</p>
              <p className="text-2xl font-black text-indigo-400 tabular-nums tracking-tighter leading-none">{paymentSummary.total}</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-300 uppercase font-black tracking-widest mb-1">Paid Database</p>
              <p className="text-2xl font-black text-cyan-400 tabular-nums tracking-tighter leading-none">{paymentSummary.paid}</p>
            </div>
          </div>
        </aside>

        {/* Main Workspace Content Area */}
        <main className="flex-1 relative z-10 flex flex-col h-full overflow-y-auto medical-scrollbar">
          <div className="max-w-[1600px] w-full p-5 lg:py-6 lg:px-8 mx-auto">
            {/* Dashboard Header Title Section */}
            <header className="mb-5 relative flex flex-col items-center text-center">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-px w-8 bg-gradient-to-r from-indigo-500 to-transparent" />
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400">Command Center</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase leading-none mt-2">
                Admin <span className="text-gradient-prestige">Dashboard</span>
              </h2>
              <p className="text-slate-300 text-xs font-bold uppercase tracking-[0.3em] max-w-3xl leading-none mt-1.5">
                {isSubAdmin ? "Assigned Workspace Modules" : "Manage nominations and user pipeline"}
              </p>

              {/* Error Banner Display */}
              {error && (
                <div className="mt-6 w-full max-w-2xl bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center justify-between">
                  <p className="text-red-400 text-sm font-bold">{error}</p>
                  <button onClick={() => setError("")} className="text-red-400/50 hover:text-red-400">✕</button>
                </div>
              )}
            </header>

            {/* Dynamic Global Filters & Search Panel (Hidden on Analytics/Settings tabs) */}
            {activeTab !== "analytics" && activeTab !== "admins" && activeTab !== "previous-editions" && activeTab !== "upcoming-editions" && activeTab !== "gallery" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 mb-4 bg-slate-900 py-3.5 px-5 rounded-2xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.3)]">
                {activeTab !== "inquiries" ? (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-amber-300 font-black uppercase tracking-widest ml-1">Event / Summit</label>
                      <select
                        value={eventFilter}
                        onChange={(e) => setEventFilter(e.target.value)}
                        className="w-full bg-[#030919] border border-white/20 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-100 focus:outline-none focus:border-indigo-400 transition-all appearance-none cursor-pointer"
                      >
                        {EVENT_FILTER_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value} className="bg-[#0f172a]">{s.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-indigo-300 font-black uppercase tracking-widest ml-1">Filter Status</label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full bg-[#030919] border border-white/20 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-100 focus:outline-none focus:border-indigo-400 transition-all appearance-none cursor-pointer"
                      >
                        {STATUS_FILTER_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value} className="bg-[#0f172a]">{s.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-indigo-300 font-black uppercase tracking-widest ml-1">Participation Type</label>
                      <select
                        value={participationTypeFilter}
                        onChange={(e) => setParticipationTypeFilter(e.target.value)}
                        className="w-full bg-[#030919] border border-white/20 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-100 focus:outline-none focus:border-indigo-400 transition-all appearance-none cursor-pointer"
                      >
                        {PARTICIPATION_TYPE_FILTER_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value} className="bg-[#0f172a]">{s.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-indigo-300 font-black uppercase tracking-widest ml-1">Location</label>
                      <select
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                        className="w-full bg-[#030919] border border-white/20 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-100 focus:outline-none focus:border-indigo-400 transition-all appearance-none cursor-pointer"
                      >
                        {LOCATION_FILTER_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value} className="bg-[#0f172a]">{s.label}</option>
                        ))}
                      </select>
                    </div>

                    {isSuperAdmin && activeTab === "nominations" && (
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-cyan-300 font-black uppercase tracking-widest ml-1">Assigned Team Member</label>
                        <select
                          value={assigneeFilter}
                          onChange={(e) => setAssigneeFilter(e.target.value)}
                          className="w-full bg-[#030919] border border-white/20 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-100 focus:outline-none focus:border-cyan-400 transition-all appearance-none cursor-pointer"
                        >
                          <option value="all" className="bg-[#0f172a]">All Team Members</option>
                          <option value="unassigned" className="bg-[#0f172a]">⚠️ Unassigned Only</option>
                          {subadmins.map((s) => (
                            <option key={s._id} value={s._id} className="bg-[#0f172a]">
                              👤 {s.name} ({s.assignedCount || 0})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="lg:col-span-3" />
                )}

                <div className={`flex flex-col gap-1 ${activeTab === "inquiries" ? "lg:col-span-5" : isSuperAdmin && activeTab === "nominations" ? "lg:col-span-1" : "lg:col-span-2"}`}>
                  <label className="text-[10px] text-cyan-300 font-black uppercase tracking-widest ml-1">Search Database</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" size={14} />
                    <input
                      type="text"
                      placeholder={activeTab === "inquiries" ? "Search inquiries..." : "Search entities..."}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-[#030919] border border-white/20 rounded-lg pl-10 pr-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400 transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="lg:col-span-6 flex items-center justify-between pt-2.5 border-t border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="flex -space-x-2">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-[#020817] bg-white/10" />
                      ))}
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-200">
                      <span className="text-indigo-400 font-black">
                        {activeTab === "inquiries" ? filteredInquiries.length : filteredNominations.length}
                      </span> Active Record Nodes Detected
                    </p>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] text-slate-300 font-black uppercase tracking-widest">Sort Protocol:</span>
                      <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className="bg-transparent text-[10px] font-black uppercase tracking-widest text-slate-200 focus:outline-none cursor-pointer hover:text-white transition-colors"
                      >
                        <option value="newest" className="bg-[#0f172a]">Newest First</option>
                        <option value="oldest" className="bg-[#0f172a]">Oldest First</option>
                      </select>
                    </div>
                    <button
                      onClick={() => {
                        setStatusFilter("all");
                        setEventFilter("all");
                        setParticipationTypeFilter("all");
                        setLocationFilter("all");
                        setAssigneeFilter("all");
                        setSearchTerm("");
                      }}
                      className="text-[10px] font-black uppercase tracking-widest text-red-300 hover:text-red-200 transition-colors flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20"
                    >
                      Reset Matrix
                    </button>
                  </div>
                </div>
              </div>
            )}



            {/* Active Tab Component Render Engine */}
            <div className="relative">
              {activeTab === "nominations" && memoizedNominationsTable}
              {activeTab === "status" && memoizedStatusTab}
              {activeTab === "analytics" && memoizedAnalyticsTab}
              {activeTab === "users" && memoizedUsersTab}
              {activeTab === "inquiries" && renderInquiriesTab()}
              {activeTab === "admins" && memoizedAdminsTab}
              {activeTab === "previous-editions" && <AdminPreviousEditions />}
              {activeTab === "upcoming-editions" && <AdminUpcomingEditions />}
              {activeTab === "gallery" && <AdminGallery token={token} />}
            </div>
          </div>
        </main>

        {/* Global Floating Modals (Outside of Main stacking context) */}
        <>
          {/* ================== EDIT MODAL ================== */}
          {editingNomination && createPortal(
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-[9999] p-4 sm:p-8">
              <div className="bg-[#050A15]/95 border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,1)] p-6 sm:p-8 rounded-[2rem] max-w-5xl w-full max-h-[90vh] overflow-y-auto medical-scrollbar relative group">
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none rounded-[2rem]" />

                <div className="absolute top-4 right-4 z-50">
                  <button onClick={() => setEditingNomination(null)} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:bg-red-500 hover:text-white transition-all shadow-lg hover:rotate-90" aria-label="Close modal">
                    <X size={20} />
                  </button>
                </div>

                <div className="relative z-10">
                  <div className="mb-8 border-b border-white/10 pb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-2 w-2 bg-indigo-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400">Admin Action</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase leading-none">Edit <span className="text-gradient-prestige">Nomination</span></h2>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    {/* Participation & Category */}
                    <div className="space-y-5 bg-white/5 p-6 rounded-2xl border border-white/10 shadow-sm hover:bg-white/[0.07] transition-colors">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2 flex items-center gap-2">
                        <span className="p-1.5 bg-indigo-500/10 rounded-lg text-xs">📑</span> Categorization
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-widest text-[#d4af37] ml-1 mb-1.5 block">Select Award / Summit Event</label>
                          <select
                            className={inputClass}
                            value={editForm.nominationType || "icon of the year award"}
                            onChange={(e) => setEditForm({ ...editForm, nominationType: e.target.value })}
                          >
                            <option value="icon of the year award" className="bg-[#0f172a] text-white">Icon of the Year Award</option>
                            <option value="women icon of the year" className="bg-[#0f172a] text-white">Women Icon of the Year</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 ml-1 mb-1.5 block">Participation Type</label>
                          <select
                            className={inputClass}
                            value={editForm.participationType || "nominated as award"}
                            onChange={(e) => setEditForm({ ...editForm, participationType: e.target.value })}
                          >
                            <option value="nominated as award" className="bg-[#0f172a] text-white">Award Nomination</option>
                            <option value="attend as speaker" className="bg-[#0f172a] text-white">Speaker</option>
                            <option value="attend as exhibitor" className="bg-[#0f172a] text-white">Exhibitor</option>
                            <option value="attend as sponsor" className="bg-[#0f172a] text-white">Sponsor</option>
                            <option value="attend as ramp show" className="bg-[#0f172a] text-white">Ramp Show</option>
                            <option value="attend as special guest" className="bg-[#0f172a] text-white">Special Guest</option>
                            <option value="award + ramp show" className="bg-[#0f172a] text-white">Award + Ramp Show</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 ml-1 mb-1.5 block">Field (Industry)</label>
                          <input className={inputClass} value={editForm.field || ""} onChange={(e) => setEditForm({ ...editForm, field: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 ml-1 mb-1.5 block">Category (User)</label>
                          <input className={inputClass} value={editForm.category || ""} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 ml-1 mb-1.5 block">Sub Category</label>
                            <input className={inputClass} value={editForm.subCategory || ""} onChange={(e) => setEditForm({ ...editForm, subCategory: e.target.value })} />
                          </div>
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 ml-1 mb-1.5 block">Other Sub</label>
                            <input className={inputClass} value={editForm.otherSubCategory || ""} onChange={(e) => setEditForm({ ...editForm, otherSubCategory: e.target.value })} />
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-widest text-amber-300 ml-1 mb-1.5 block">Assigned Category (Admin)</label>
                          <input className={inputClass} value={editForm.assignedCategory || ""} onChange={(e) => setEditForm({ ...editForm, assignedCategory: e.target.value })} placeholder="Final Category Name" />
                        </div>
                      </div>
                    </div>

                    {/* Identity */}
                    <div className="space-y-5 bg-white/5 p-6 rounded-2xl border border-white/10 shadow-sm hover:bg-white/[0.07] transition-colors">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-cyan-400 mb-2 flex items-center gap-2">
                        <span className="p-1.5 bg-cyan-500/10 rounded-lg text-xs">🆔</span> Core Identity
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 ml-1 mb-1.5 block">Nominee Name</label>
                          <input className={inputClass} value={editForm.nomineeName || ""} onChange={(e) => setEditForm({ ...editForm, nomineeName: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 ml-1 mb-1.5 block">Organization</label>
                          <input className={inputClass} value={editForm.organization || ""} onChange={(e) => setEditForm({ ...editForm, organization: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 ml-1 mb-1.5 block">Designation</label>
                            <input className={inputClass} value={editForm.designation || ""} onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })} />
                          </div>
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 ml-1 mb-1.5 block">Turnover</label>
                            <input className={inputClass} value={editForm.turnover || ""} onChange={(e) => setEditForm({ ...editForm, turnover: e.target.value })} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 ml-1 mb-1.5 block">Direct Mobile</label>
                            <input className={inputClass} value={editForm.mobile || ""} onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })} />
                          </div>
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 ml-1 mb-1.5 block">Direct Email</label>
                            <input className={inputClass} value={editForm.email || ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Leadership & Contact */}
                    <div className="md:col-span-2 grid md:grid-cols-2 gap-5">
                      <div className="space-y-5 bg-white/5 p-6 rounded-2xl border border-white/10 shadow-sm hover:bg-white/[0.07] transition-colors">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2 flex items-center gap-2">
                          <span className="p-1.5 bg-emerald-500/10 rounded-lg text-xs">👑</span> Leadership (Org Head)
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <input className={inputClass} value={editForm.orgHeadName || ""} onChange={(e) => setEditForm({ ...editForm, orgHeadName: e.target.value })} placeholder="Name" />
                          <input className={inputClass} value={editForm.orgHeadDesignation || ""} onChange={(e) => setEditForm({ ...editForm, orgHeadDesignation: e.target.value })} placeholder="Designation" />
                          <input className={inputClass} value={editForm.orgHeadMobile || ""} onChange={(e) => setEditForm({ ...editForm, orgHeadMobile: e.target.value })} placeholder="Mobile" />
                          <input className={inputClass} value={editForm.orgHeadEmail || ""} onChange={(e) => setEditForm({ ...editForm, orgHeadEmail: e.target.value })} placeholder="Email" />
                        </div>
                      </div>
                      <div className="space-y-5 bg-white/5 p-6 rounded-2xl border border-white/10 shadow-sm hover:bg-white/[0.07] transition-colors">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-2 flex items-center gap-2">
                          <span className="p-1.5 bg-purple-500/10 rounded-lg text-xs">📞</span> Operational Point (Contact)
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <input className={inputClass} value={editForm.contactName || ""} onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })} placeholder="Name" />
                          <input className={inputClass} value={editForm.contactDesignation || ""} onChange={(e) => setEditForm({ ...editForm, contactDesignation: e.target.value })} placeholder="Designation" />
                          <input className={inputClass} value={editForm.contactMobile || ""} onChange={(e) => setEditForm({ ...editForm, contactMobile: e.target.value })} placeholder="Mobile" />
                          <input className={inputClass} value={editForm.contactEmail || ""} onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })} placeholder="Email" />
                        </div>
                      </div>
                    </div>

                    {/* Logistics & Remarks */}
                    <div className="md:col-span-2 space-y-5 bg-white/5 p-6 rounded-2xl border border-white/10 shadow-sm hover:bg-white/[0.07] transition-colors">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-[#d4af37] mb-2 flex items-center gap-2">
                        <span className="p-1.5 bg-[#d4af37]/10 rounded-lg text-xs">🌍</span> Logistics & Assessment
                      </h3>
                      <div className="grid md:grid-cols-4 gap-4">
                        <input className={inputClass} value={editForm.city || ""} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} placeholder="City" />
                        <input className={inputClass} value={editForm.state || ""} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} placeholder="State" />
                        <input className={inputClass} value={editForm.zip || ""} onChange={(e) => setEditForm({ ...editForm, zip: e.target.value })} placeholder="ZIP" />
                        <input className={inputClass} value={editForm.amount || ""} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} placeholder="Fee / Amount" />
                      </div>
                      <div className="grid md:grid-cols-2 gap-5 mt-5">
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 ml-1 mb-1.5 block">Public Remarks</label>
                          <textarea className={`${inputClass} min-h-[80px] resize-none`} value={editForm.remarks || ""} onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-widest text-red-300 ml-1 mb-1.5 block">Internal Admin Remarks</label>
                          <textarea className={`${inputClass} min-h-[80px] resize-none border-red-500/20 focus:border-red-500/50`} value={editForm.adminRemark || ""} onChange={(e) => setEditForm({ ...editForm, adminRemark: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-white/10">
                    <button onClick={() => setEditingNomination(null)} className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white hover:bg-white/5 transition-all">Discard Changes</button>
                    <button onClick={handleSaveEdit} className="btn-primary px-8 py-3 text-[10px] shadow-[0_0_20px_rgba(251,113,133,0.4)] rounded-xl">Commit Update</button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* ================== DELETE MODAL ================== */}
          {deleteConfirmId && createPortal(
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
              <div className="bg-[#050A15] border border-red-500/20 shadow-[0_0_100px_rgba(239,68,68,0.15)] p-10 rounded-[2rem] max-w-sm w-full text-center relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
                <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6 border border-red-500/20 group hover:scale-110 transition-transform">
                  <Trash2 size={32} />
                </div>
                <h2 className="text-2xl font-black text-white mb-3 tracking-tighter uppercase">Confirm <span className="text-red-500">Delete</span></h2>
                <p className="text-slate-300 mb-8 text-xs font-medium leading-relaxed italic">"Warning: This record will be permanently wiped from the active database. This protocol is irreversible."</p>
                <div className="flex flex-col gap-3">
                  <button onClick={handleDelete} className="w-full bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-xl shadow-lg shadow-red-500/20 transition-all active:scale-95">Delete Record</button>
                  <button onClick={() => setDeleteConfirmId(null)} className="w-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-xl transition-all">Cancel Request</button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* ================== VIEW MODAL ================== */}
          {viewingNomination && createPortal(
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-[9999] p-4 sm:p-8">
              <div className="bg-[#050A15]/95 border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,1)] p-6 sm:p-8 rounded-[2rem] max-w-6xl w-full max-h-[90vh] overflow-y-auto medical-scrollbar relative group">
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none rounded-[2rem]" />

                <div className="absolute top-4 right-4 z-50">
                  <button onClick={() => setViewingNomination(null)} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:bg-red-500 hover:text-white transition-all shadow-lg hover:rotate-90" aria-label="Close modal">
                    <X size={20} />
                  </button>
                </div>

                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-white/10 pb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-2 w-2 bg-[#d4af37] rounded-full animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#d4af37]">Complete Dossier</span>
                      </div>
                      <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase leading-none">{viewingNomination.nomineeName}</h2>
                      <p className="text-base md:text-lg font-bold text-indigo-200 uppercase tracking-widest mt-1">{viewingNomination.organization}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <div className="bg-[#d4af37]/10 border border-[#d4af37]/20 px-4 py-2 rounded-xl">
                        <p className="text-[8px] font-black uppercase tracking-widest text-[#d4af37] mb-1">Award / Summit Event</p>
                        <p className="text-xs font-black uppercase tracking-widest text-[#d4af37]">
                          {(viewingNomination.nominationType || "").toLowerCase().includes("women") ? "Women Icon of the Year" : "Icon of the Year Award"}
                        </p>
                      </div>
                      <div className="bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-xl">
                        <p className="text-[8px] font-black uppercase tracking-widest text-indigo-300 mb-1">Application Status</p>
                        <p className="text-xs font-black uppercase tracking-widest text-indigo-400">{viewingNomination.status || 'Nominated'}</p>
                      </div>
                      <div className="bg-cyan-500/10 border border-cyan-500/20 px-4 py-2 rounded-xl">
                        <p className="text-[8px] font-black uppercase tracking-widest text-cyan-300 mb-1">Participation</p>
                        <p className="text-xs font-black uppercase tracking-widest text-cyan-400">{viewingNomination.participationType}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 space-y-5">
                      {/* Identity Details */}
                      <div className="bg-white/5 border border-white/10 p-5 rounded-2xl hover:bg-white/[0.07] transition-colors shadow-sm">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d4af37] mb-5 flex items-center gap-2">
                          <span className="p-1.5 bg-[#d4af37]/10 rounded-lg text-xs">🏅</span> Classification
                        </h3>
                        <div className="grid sm:grid-cols-2 gap-5">
                          <DetailItem
                            label="Award / Summit Event"
                            val={(viewingNomination.nominationType || "").toLowerCase().includes("women") ? "Women Icon of the Year" : "Icon of the Year Award"}
                            color="text-[#d4af37]"
                          />
                          {viewingNomination.field && <DetailItem label="Field" val={viewingNomination.field} />}
                          <DetailItem label="Category" val={viewingNomination.category} />
                          <DetailItem label="Sub Category" val={viewingNomination.subCategory} />
                          {viewingNomination.otherSubCategory && <DetailItem label="Custom Category" val={viewingNomination.otherSubCategory} />}
                          <DetailItem label="System Classification" val={viewingNomination.assignedCategory} color="text-[#d4af37]" />
                        </div>
                      </div>

                      {/* Leadership & Operations */}
                      <div className="grid sm:grid-cols-2 gap-5">
                        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl hover:bg-white/[0.07] transition-colors shadow-sm">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 mb-5 flex items-center gap-2">
                            <span className="p-1.5 bg-cyan-500/10 rounded-lg text-xs">👑</span> Organization Head
                          </h3>
                          <div className="space-y-4">
                            <DetailItem label="Name" val={viewingNomination.orgHeadName} />
                            <DetailItem label="Designation" val={viewingNomination.orgHeadDesignation} />
                            <DetailItem label="Mobile" val={viewingNomination.orgHeadMobile} />
                            <DetailItem label="Email" val={viewingNomination.orgHeadEmail} />
                          </div>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl hover:bg-white/[0.07] transition-colors shadow-sm">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-5 flex items-center gap-2">
                            <span className="p-1.5 bg-emerald-500/10 rounded-lg text-xs">📞</span> Primary Contact
                          </h3>
                          <div className="space-y-4">
                            <DetailItem label="Contact Person" val={viewingNomination.contactName} />
                            <DetailItem label="Designation" val={viewingNomination.contactDesignation} />
                            <DetailItem label="Mobile" val={viewingNomination.contactMobile} />
                            <DetailItem label="Email Endpoint" val={viewingNomination.contactEmail} />
                          </div>
                        </div>
                      </div>

                      {/* Geography & Presence */}
                      <div className="bg-white/5 border border-white/10 p-5 rounded-2xl hover:bg-white/[0.07] transition-colors shadow-sm">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400 mb-5 flex items-center gap-2">
                          <span className="p-1.5 bg-purple-500/10 rounded-lg text-xs">🌍</span> Geographic Presence
                        </h3>
                        <div className="grid sm:grid-cols-2 gap-5">
                          <DetailItem label="Physical Address" val={viewingNomination.street} />
                          <DetailItem label="City & State" val={`${viewingNomination.city}, ${viewingNomination.state} ${viewingNomination.zip}`} />
                          <DetailItem label="Event Preference" val={Array.isArray(viewingNomination.preferredLocation) ? viewingNomination.preferredLocation.join(', ') : viewingNomination.preferredLocation} />
                          <DetailItem label="Digital Hub" val={viewingNomination.website} isLink />
                        </div>
                      </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-5">
                      {/* Financials & Status */}
                      <div className="bg-gradient-to-br from-indigo-900/40 to-[#020817] border border-indigo-500/20 p-5 rounded-2xl shadow-sm">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-5 flex items-center gap-2">
                          💸 Financial Node
                        </h3>
                        <div className="space-y-4">
                          <DetailItem label="Valuation / Turnover" val={viewingNomination.turnover} />
                          <DetailItem label="Fee Status" val={viewingNomination.paymentStatus || 'not_paid'} />
                          <DetailItem label="Secured Amount" val={viewingNomination.amount || '—'} color="text-indigo-400" />
                        </div>
                      </div>

                      {/* Security & Validation */}
                      <div className="bg-white/5 border border-white/10 p-5 rounded-2xl shadow-sm">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-5 flex items-center gap-2">
                          🛡️ System Metadata
                        </h3>
                        <div className="space-y-4 mb-5">
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Source Account</p>
                            <p className="text-[10px] font-bold text-slate-200">{viewingNomination.user?.email || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Created Timestamp</p>
                            <p className="text-[10px] font-mono text-slate-200">{new Date(viewingNomination.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="pt-4 border-t border-white/10">
                          <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest mb-2">
                            <span className="text-slate-400">Data Integrity</span>
                            <span className="text-[#d4af37]">Verified</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-[#d4af37] w-full" />
                          </div>
                        </div>
                      </div>

                      {/* PDF Dossier */}
                      {viewingNomination.pdfUrl && (
                        <a href={viewingNomination.pdfUrl} target="_blank" rel="noopener noreferrer" className="block group">
                          <div className="bg-gradient-to-br from-[#d4af37]/20 to-[#020817] border border-[#d4af37]/30 p-5 rounded-2xl hover:shadow-[0_0_20px_rgba(212,175,55,0.2)] transition-all duration-300 transform group-hover:-translate-y-1">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-[#d4af37]/20 flex items-center justify-center text-[#d4af37] group-hover:scale-110 transition-transform">
                                <FileText size={20} />
                              </div>
                              <div>
                                <div className="text-[8px] font-black uppercase tracking-[0.3em] text-[#d4af37]/80">Supporting Document</div>
                                <div className="text-xs font-black text-[#d4af37] mt-1">Download PDF</div>
                              </div>
                            </div>
                          </div>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Remarks */}
                  <div className="mt-5 grid md:grid-cols-2 gap-5">
                    <div className="bg-white/5 border border-white/10 p-5 rounded-2xl shadow-sm">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-3">Public Remarks</h3>
                      <p className="text-xs italic text-slate-200 font-medium leading-relaxed">"{viewingNomination.remarks || 'No public remarks provided.'}"</p>
                    </div>
                    <div className="bg-red-500/5 border border-red-500/20 p-5 rounded-2xl shadow-sm">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-300 mb-3 flex items-center gap-2">⚠️ Internal Notes</h3>
                      <p className="text-xs italic text-red-200 font-medium leading-relaxed">{viewingNomination.adminRemark || 'System: No internal logs for this entity.'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* ================== SUB-ADMIN CREATE/EDIT MODAL ================== */}
          {subAdminModalOpen && createPortal(
            <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-[9999] p-4 sm:p-6">
              <div className="bg-[#050A15]/95 border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,1)] p-6 sm:p-8 rounded-[2.5rem] max-w-2xl w-full max-h-[90vh] overflow-y-auto medical-scrollbar relative group">
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 via-transparent to-transparent pointer-events-none rounded-[2.5rem]" />

                {/* Close Button */}
                <div className="absolute top-5 right-5 z-20">
                  <button
                    onClick={() => setSubAdminModalOpen(false)}
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:bg-red-500 hover:text-white transition-all hover:rotate-90"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="relative z-10">
                  <div className="mb-6 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-2 w-2 bg-indigo-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400">Team Governance</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
                      {editingSubAdmin ? "Edit Team Member" : "Create New Team Member"}
                    </h2>
                    <p className="text-slate-300 text-xs font-medium mt-1">
                      {editingSubAdmin
                        ? "Update name, permissions, or reset credentials for this team member."
                        : "Generate credentials and configure accessible dashboard modules."}
                    </p>
                  </div>

                  {subAdminFormError && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center justify-between">
                      <span>{subAdminFormError}</span>
                      <button onClick={() => setSubAdminFormError("")} className="text-red-400/50 hover:text-red-400">✕</button>
                    </div>
                  )}

                  <form onSubmit={handleSaveSubAdmin} className="space-y-6">
                    {/* Basic Info */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={subAdminForm.name}
                          onChange={(e) => setSubAdminForm({ ...subAdminForm, name: e.target.value })}
                          placeholder="e.g. John Doe"
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          disabled={Boolean(editingSubAdmin)}
                          value={subAdminForm.email}
                          onChange={(e) => setSubAdminForm({ ...subAdminForm, email: e.target.value })}
                          placeholder="team@iconoftheyearawards.com"
                          className={`${inputClass} ${editingSubAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                          {editingSubAdmin ? "Reset Password (Optional)" : "Password *"}
                        </label>
                        {!editingSubAdmin && (
                          <button
                            type="button"
                            onClick={() => setSubAdminForm({ ...subAdminForm, password: generateRandomPassword() })}
                            className="text-[10px] font-black uppercase tracking-wider text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                          >
                            <RefreshCw size={11} /> Generate New
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={subAdminForm.password}
                          onChange={(e) => setSubAdminForm({ ...subAdminForm, password: e.target.value })}
                          placeholder={editingSubAdmin ? "Leave blank to keep existing password" : "Password"}
                          className={`${inputClass} font-mono`}
                        />
                      </div>
                    </div>

                    {/* Tab Permissions Section with Checkboxes */}
                    <div className="pt-4 border-t border-white/10">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div>
                          <label className="text-[11px] font-black uppercase tracking-widest text-white flex items-center gap-2">
                            <span>🔐 Accessible Dashboard Modules</span>
                          </label>
                          <p className="text-[10px] text-slate-300 font-medium mt-0.5">
                            Uncheck any module to revoke access. If Nominations is unchecked, the nominations tab is hidden.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleSelectAllTabs}
                            className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[9px] font-black uppercase tracking-wider hover:bg-indigo-500/20"
                          >
                            Select All
                          </button>
                          <button
                            type="button"
                            onClick={handleClearAllTabs}
                            className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-[9px] font-black uppercase tracking-wider hover:bg-white/10"
                          >
                            Clear All
                          </button>
                        </div>
                      </div>

                      {/* 8 Tabs Grid */}
                      <div className="grid sm:grid-cols-2 gap-2.5">
                        {MANAGEABLE_TABS.map((tab) => {
                          const isChecked = subAdminForm.allowedTabs.includes(tab.id);
                          return (
                            <div
                              key={tab.id}
                              onClick={() => handleToggleTabPermission(tab.id)}
                              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                                isChecked
                                  ? "bg-indigo-500/10 border-indigo-500/40 shadow-[0_0_15px_rgba(67,56,202,0.15)]"
                                  : "bg-white/[0.02] border-white/5 opacity-70 hover:opacity-100"
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                                isChecked
                                  ? "bg-indigo-500 border-indigo-400 text-white"
                                  : "border-white/20 bg-black/40"
                              }`}>
                                {isChecked && <Check size={13} strokeWidth={3} />}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-base">{tab.icon}</span>
                                  <span className={`text-xs font-black uppercase tracking-wide truncate ${isChecked ? "text-white" : "text-slate-300"}`}>
                                    {tab.label}
                                  </span>
                                </div>
                                <p className="text-[9px] text-slate-300 truncate">{tab.desc}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-3 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-[10px] text-cyan-300 leading-relaxed">
                        💡 <strong>Nominations Scoping:</strong> When Nominations is checked, this user only sees nominations assigned specifically to them in the database. When unchecked, Nominations is completely inaccessible.
                      </div>
                    </div>

                    {/* Submit Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => setSubAdminModalOpen(false)}
                        className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white hover:bg-white/5 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingSubAdmin}
                        className="btn-primary px-8 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-[0_0_30px_rgba(67,56,202,0.4)] disabled:opacity-50"
                      >
                        {savingSubAdmin
                          ? "Saving..."
                          : editingSubAdmin
                          ? "Save Team Member"
                          : "Create Team Member"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* ================== GENERATED CREDENTIALS MODAL ================== */}
          {createdCredentials && createPortal(
            <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[9999] p-4">
              <div className="bg-[#050A15] border border-cyan-500/30 shadow-[0_0_80px_rgba(6,182,212,0.2)] p-8 sm:p-10 rounded-[2.5rem] max-w-lg w-full relative overflow-hidden text-center">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-cyan-400 to-indigo-500 shadow-[0_0_20px_rgba(6,182,212,0.5)]" />

                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mx-auto mb-4 text-3xl">
                  🎉
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-2">
                  <Check size={12} /> Credentials Generated
                </div>

                <h2 className="text-2xl font-black text-white tracking-tight uppercase mb-2">
                  Team Member Account Ready
                </h2>
                <p className="text-slate-300 text-xs font-medium mb-6 leading-relaxed">
                  Copy and share these access credentials with <strong>{createdCredentials.name}</strong>. The password will not be displayed again.
                </p>

                {/* Credentials Card */}
                <div className="p-5 rounded-2xl bg-[#020817] border border-white/10 text-left space-y-3 mb-6">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Admin Login URL</span>
                    <span className="text-xs font-mono font-bold text-cyan-300 break-all">{window.location.origin}/admin/login</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Email Identity</span>
                    <span className="text-xs font-bold text-white font-mono">{createdCredentials.email}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Generated Password</span>
                    <span className="text-base font-black text-[#d4af37] font-mono tracking-wider select-all">{createdCredentials.password}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Permitted Modules</span>
                    <div className="flex flex-wrap gap-1">
                      {createdCredentials.allowedTabs.map(tId => (
                        <span key={tId} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-bold text-slate-200 uppercase">
                          {MANAGEABLE_TABS.find(t => t.id === tId)?.label || tId}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleCopyCredentials}
                    className={`w-full py-4 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg ${
                      copiedCredentials
                        ? "bg-emerald-500 text-white shadow-emerald-500/20"
                        : "bg-cyan-500 hover:bg-cyan-400 text-[#020817] shadow-cyan-500/20"
                    }`}
                  >
                    {copiedCredentials ? (
                      <>
                        <Check size={16} />
                        <span>✓ Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        <span>Copy All Credentials</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setCreatedCredentials(null)}
                    className="w-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-black uppercase tracking-widest text-[10px] py-3.5 rounded-xl transition-all"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}
        </>
      </div>
    </>
  );
}

