import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { KioskShell } from "../components/KioskShell";
import { useVote } from "../context/VoteContext";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Check, ArrowRight, ArrowLeft, Award } from "lucide-react";

export default function VotePage() {
  const { student, selections, setSelections, stepIndex, setStepIndex } = useVote();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [allCandidates, setAllCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Single round-trip on mount: posts + all candidates pre-loaded.
  // Eliminates the 30s-per-category lag caused by serial Cosmos queries.
  useEffect(() => {
    if (!student) return;
    let active = true;
    setLoading(true);
    api.get("/bootstrap")
      .then(({ data }) => {
        if (!active) return;
        setPosts(data.posts || []);
        setAllCandidates(data.candidates || []);
      })
      .catch(() => toast.error("Failed to load ballot. Please try again."))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [student]);

  const post = posts[stepIndex];
  const total = posts.length;
  const progressPct = total ? Math.round((stepIndex / total) * 100) : 0;
  const selected = post ? selections?.[post.key] : null;
  const candidates = post ? allCandidates.filter(c => c.post === post.key) : [];

  if (!student) return <Navigate to="/" replace />;

  const choose = (cid) => post && setSelections({ ...selections, [post.key]: cid });

  const next = async () => {
    if (!post) return;
    if (!selected) {
      toast.error("Please select a candidate");
      return;
    }
    if (stepIndex < total - 1) {
      setStepIndex(stepIndex + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/votes", { admission_no: student.admission_no, selections });
      navigate("/thank-you");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to submit vote");
    } finally {
      setSubmitting(false);
    }
  };

  const prev = () => { if (stepIndex > 0) setStepIndex(stepIndex - 1); };

  if (!total) {
    return (
      <KioskShell>
        <div className="glass rounded-3xl p-12 text-center max-w-xl mx-auto">
          <h1 className="font-display text-3xl font-bold hero-3d">No active categories</h1>
          <p className="text-[color:var(--sdps-ink)] mt-3">The administrator hasn't set up any voting categories yet.</p>
        </div>
      </KioskShell>
    );
  }

  return (
    <KioskShell>
      <div className="rise">
        <div className="flex items-center justify-between mb-3">
          <div className="step-pill"><Award className="w-3.5 h-3.5" /> Post {stepIndex + 1} of {total}</div>
          <div className="text-sm font-bold text-[color:var(--sdps-muted)]" data-testid="vote-progress-label">
            {progressPct}% complete
          </div>
        </div>
        <div className="h-3 rounded-full bg-blue-100 overflow-hidden mb-8">
          <div className="h-full transition-all duration-500"
               style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, #0F3C8A, #D4AF37)" }} />
        </div>

        <h1 className="font-display text-4xl md:text-6xl font-black hero-3d leading-tight">
          Vote for <span className="gold-text">{post?.title}</span>
        </h1>
        <p className="mt-3 text-lg text-[color:var(--sdps-ink)] font-medium">Tap a candidate card to make your selection.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
          {[1,2,3,4].map(i => <div key={i} className="h-72 rounded-3xl bg-white/60 animate-pulse" />)}
        </div>
      ) : candidates.length === 0 ? (
        <div className="glass rounded-3xl p-10 mt-10 text-center">
          <p className="text-lg text-[color:var(--sdps-ink)] font-medium">No candidates added yet for this post.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-10">
          {candidates.map((c, i) => {
            const isSel = selected === c.id;
            return (
              <button key={c.id} type="button" onClick={() => choose(c.id)}
                data-testid={`vote-candidate-card-${c.id}`}
                className={`candidate-card text-left rounded-3xl p-5 relative rise delay-${(i % 4) + 1} ${isSel ? "selected" : ""}`}
              >
                {isSel && (
                  <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center"
                       style={{ background: "linear-gradient(180deg,#F4D571,#D4AF37)", boxShadow: "0 8px 20px rgba(212,175,55,0.5)" }}>
                    <Check className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className="flex items-start gap-4">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-100 to-blue-200">
                    {c.photo ? <img src={c.photo} alt={c.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-[color:var(--sdps-blue)]">{c.name?.[0] || "?"}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs tracking-[0.22em] uppercase font-bold text-[color:var(--sdps-muted)]">Candidate</div>
                    <div className="font-display text-2xl font-bold leading-tight mt-1 truncate">{c.name}</div>
                    <div className="mt-3 flex items-center gap-2">
                      {c.symbol_image ? (
                        <img src={c.symbol_image} alt={c.symbol} className="w-7 h-7 rounded-md object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#F3E5AB] to-[#D4AF37] flex items-center justify-center text-xs font-bold text-[color:var(--sdps-ink)]">
                          {(c.symbol || "?")[0]}
                        </div>
                      )}
                      <span className="text-sm font-semibold text-[color:var(--sdps-ink)]">Symbol: {c.symbol || "—"}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-10 flex items-center justify-between gap-4">
        <button onClick={prev} disabled={stepIndex === 0} data-testid="vote-prev-btn"
          className="h-14 px-6 rounded-2xl border-2 border-[rgba(15,60,138,0.15)] bg-white font-bold flex items-center gap-2 disabled:opacity-40">
          <ArrowLeft className="w-5 h-5" /> Previous
        </button>
        <div className="hidden sm:flex items-center gap-2">
          {posts.map((p, i) => (
            <div key={p.key}
              className={`w-2.5 h-2.5 rounded-full ${i < stepIndex ? "bg-[color:var(--sdps-gold)]" : i === stepIndex ? "bg-[color:var(--sdps-blue)] scale-125" : "bg-blue-200"} transition`} />
          ))}
        </div>
        <button onClick={next} disabled={!selected || submitting} data-testid="vote-next-btn"
          className="btn-primary-3d h-14 px-7 rounded-2xl font-bold flex items-center gap-2 disabled:opacity-40">
          {stepIndex === total - 1 ? (submitting ? "Submitting..." : "Submit Ballot") : "Next"} <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </KioskShell>
  );
}
