import { useState, useEffect, useRef } from "react";
import { FaWhatsapp, FaTimes } from "react-icons/fa";
import { FiChevronRight, FiMessageSquare } from "react-icons/fi";

export default function WhatsAppButton() {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);
    const whatsappNumber = "+919266392666";
    const cleanNumber = whatsappNumber.replace(/\D/g, "");

    const options = [
        {
            id: "icon-of-the-year",
            title: "Icon of the Year",
            badge: "Edition 2026",
            desc: "Honouring Excellence and Achievement Across India",
            icon: "🏆",
            message: "Hello, I'm interested in Icon of The Year, 2026.",
            accentClass: "from-[#d4af37]/20 via-[#f2d06b]/10 to-transparent hover:border-[#d4af37] text-[#d4af37]",
        },
        {
            id: "women-icon-of-the-year",
            title: "Women Icon of the Year",
            badge: "Edition 2026",
            desc: "Celebrating Women Who Inspire Change. Bolder, Braver, Brighter.",
            icon: "👑",
            message: "Hello, I'm interested in the Women Icon of The Year, 2026.",
            accentClass: "from-pink-500/20 via-rose-500/10 to-transparent hover:border-pink-400 text-pink-400",
        },
    ];

    // Close popup on ESC key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === "Escape") setIsOpen(false);
        };
        if (isOpen) {
            window.addEventListener("keydown", handleEscape);
        }
        return () => window.removeEventListener("keydown", handleEscape);
    }, [isOpen]);

    // Close popup when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const handleOptionClick = (message) => {
        // Copy to clipboard as backup in case WhatsApp Web preserves an unsent draft
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(message).catch(() => { });
        }
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
            {/* WhatsApp Options Popup */}
            {isOpen && (
                <div
                    className="mb-4 w-[calc(100vw-3rem)] max-w-sm rounded-2xl bg-[#121b22] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
                    role="dialog"
                    aria-label="Select WhatsApp Inquiry Option"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#005c4b] to-[#075e54] p-4 text-white flex items-center justify-between shadow-md">
                        <div className="flex items-center gap-3">
                            <div className="relative w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                                <FaWhatsapp className="w-6 h-6 text-[#25D366]" />
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#25D366] rounded-full border-2 border-[#121b22]"></span>
                            </div>
                            <div>
                                <h4 className="font-bold text-sm leading-tight text-white flex items-center gap-1.5">
                                    Connect on WhatsApp
                                </h4>
                                <p className="text-[11px] text-white/70">Select an edition to chat</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-7 h-7 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                            aria-label="Close"
                        >
                            <FaTimes className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-4 space-y-3 bg-[#0c1317]">
                        <div className="bg-[#1f2c34] p-3 rounded-xl border border-white/5 flex items-start gap-2.5">
                            <FiMessageSquare className="w-4 h-4 text-[#25D366] mt-0.5 shrink-0" />
                            <p className="text-xs text-gray-300 leading-relaxed">
                                Hi there! 👋 Which award edition would you like to inquire about?
                            </p>
                        </div>

                        <div className="space-y-2 pt-1">
                            {options.map((option) => {
                                const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(option.message)}`;
                                return (
                                    <a
                                        key={option.id}
                                        href={whatsappUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => handleOptionClick(option.message)}
                                        className={`w-full group text-left p-3.5 rounded-xl bg-gradient-to-br ${option.accentClass} border border-white/10 hover:scale-[1.02] active:scale-[0.99] transition-all duration-200 flex items-center justify-between gap-3 shadow-md cursor-pointer block`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="text-2xl p-2 rounded-lg bg-black/30 border border-white/10 shrink-0">
                                                {option.icon}
                                            </span>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-xs font-black uppercase tracking-wider text-white group-hover:text-[#25D366] transition-colors truncate">
                                                        {option.title}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-gray-400 line-clamp-1 leading-snug">
                                                    {option.desc}
                                                </p>
                                                <div className="mt-1.5 px-2 py-0.5 rounded bg-black/40 border border-white/5 text-[10px] text-gray-300 font-mono line-clamp-1">
                                                    💬 "{option.message}"
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-7 h-7 rounded-full bg-white/5 group-hover:bg-[#25D366] group-hover:text-black text-gray-400 flex items-center justify-center shrink-0 transition-colors">
                                            <FiChevronRight className="w-4 h-4" />
                                        </div>
                                    </a>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2.5 bg-[#121b22] border-t border-white/5 flex items-center justify-center">
                        <span className="text-[10px] text-gray-400 font-medium tracking-wide">
                            Official WhatsApp Support • 24/7 Response
                        </span>
                    </div>
                </div>
            )}

            {/* Main Floating Trigger Button */}
            <button
                onClick={() => setIsOpen((prev) => !prev)}
                className="relative group flex items-center justify-center focus:outline-none cursor-pointer"
                aria-label="Contact us on WhatsApp"
                aria-expanded={isOpen}
            >
                {/* Pulse Rings - visible when closed */}
                {!isOpen && (
                    <>
                        <span className="absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-75 animate-ping"></span>
                        <span className="absolute inline-flex h-14 w-14 rounded-full bg-[#25D366] opacity-40 animate-pulse"></span>
                    </>
                )}

                {/* Button Body */}
                <div
                    className={`relative ${isOpen ? "bg-red-500 hover:bg-red-600 rotate-90" : "bg-[#25D366] hover:bg-[#20ba59]"
                        } text-white p-3 rounded-full shadow-[0_10px_25px_-5px_#25d366aa] hover:shadow-[0_15px_35px_-5px_#25d366cc] transform hover:scale-110 transition-all duration-300 border-2 border-white/20`}
                >
                    {isOpen ? <FaTimes className="w-7 h-7 -rotate-90" /> : <FaWhatsapp className="w-7 h-7" />}
                </div>

                {/* Tooltip - only show when closed */}
                {!isOpen && (
                    <div className="absolute right-full mr-4 px-3 py-1.5 bg-white text-[#25D366] text-sm font-bold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap border-b-4 border-[#25D366]">
                        Chat on WhatsApp
                        <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-white rotate-45"></div>
                    </div>
                )}
            </button>
        </div>
    );
}
