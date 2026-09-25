/* NovaSmart Dashboard Client Controller - Full Interactivity & Dual Theme Engine */

let globalData = {
  overview: null,
  agents: [],
  customers: [],
  usage: null,
  logs: [],
  governance: null,
  activeGovFilter: 'ALL'
};

let activeTierFilter = 'ALL';
let charts = {};
let isDndMode = false;
let isRemediated = false;
let soundEnabled = true;
let currentActiveAgentId = null;
let currentActiveCustomerId = null;

// Audio Synthesizer via Web Audio API (Zero external dependencies)
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playSfx(type) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (type === 'dice') {
      // Rapid clicking noise like rolling dice
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(180 + Math.random() * 260, ctx.currentTime);
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.05);
        }, i * 70);
      }
    } else if (type === 'spell') {
      // Magical ascending dual arpeggio
      const notes = [330, 440, 554, 659, 880];
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          gain.gain.setValueAtTime(0.06, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.2);
        }, idx * 60);
      });
    } else if (type === 'success') {
      // Triumphant chord
      [523.25, 659.25, 783.99, 1046.50].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.07, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      });
    } else if (type === 'coin') {
      // Sweet high metallic bell tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1567.98, ctx.currentTime);
      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.36);
    }
  } catch (e) {
    console.debug('Audio play inhibited:', e);
  }
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  const icon = document.getElementById('sound-icon');
  const label = document.getElementById('sound-label');
  if (soundEnabled) {
    if (icon) icon.setAttribute('data-lucide', 'volume-2');
    if (label) label.textContent = 'SFX';
    showToast('Sound Effects: Enabled 🔊');
    playSfx('coin');
  } else {
    if (icon) icon.setAttribute('data-lucide', 'volume-x');
    if (label) label.textContent = 'Muted';
    showToast('Sound Effects: Muted 🔇');
  }
  lucide.createIcons();
}

function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `p-3 rounded-xl border text-xs font-semibold shadow-xl transition-all duration-300 pointer-events-auto flex items-center gap-2 ${
    isDndMode 
      ? 'bg-stone-900 border-amber-500/70 text-amber-200' 
      : 'bg-slate-900 border-indigo-500/50 text-slate-100'
  }`;
  toast.innerHTML = `<span>✨</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

// D&D Character Lore Mappings
const DND_AGENTS_MAP = {
  "Price Match Agent": {
    name: "Sir Valerius, Paladin of Price Parity",
    role: "Level 18 Paladin • Oath of the Sacred Ledger",
    customersLabel: "Nobles Shielded",
    callsLabel: "Smite Cantrips",
    latencyLabel: "Initiative",
    runtime: "High Citadel of Vertex AI",
    identity: "Sacred SPIFFE Sigil (Per-Familiar)",
    model: "Tome of Gemini 3.6 Flash",
    securityStatus: "Holy Ward Active: Sealed per-agent identity",
    actionLabel: "⚔️ Test Parity Spell",
    icon: "shield"
  },
  "Customer Personalization Agent": {
    name: "Archmage Elyndor, Keeper of Patron Lore",
    role: "Level 20 Divination Wizard • Mind Scryer",
    customersLabel: "Bound Souls",
    callsLabel: "Telepathic Probes",
    latencyLabel: "Cast Time",
    runtime: "High Citadel of Vertex AI",
    identity: "novasmart-customer-sa (Shared Cloak!)",
    model: "Tome of Gemini 3.6 Flash",
    securityStatus: "⚠️ Curse Detected: Sacred cloak shared with Shadow Rogue",
    actionLabel: "🔮 Scry Patron Secret",
    icon: "book-open"
  },
  "Markdown Strategy Agent": {
    name: "Balthazar, Grand Crucible Alchemist",
    role: "Level 16 Transmutation Alchemist • Inventory Cleanser",
    customersLabel: "Guild Merchants",
    callsLabel: "Transmutations",
    latencyLabel: "Brew Time",
    runtime: "High Citadel of Vertex AI",
    identity: "Sacred SPIFFE Sigil (Per-Familiar)",
    model: "Tome of Gemini 3.6 Flash",
    securityStatus: "Alchemical equilibrium maintained",
    actionLabel: "⚗️ Transmute Clearance",
    icon: "flame"
  },
  "promo-agent-shadow": {
    name: "Vex the Unregistered Rogue",
    role: "Level 14 Rogue Assassin • Cloud Run Underdark Outlaw",
    customersLabel: "Victims Tempted",
    callsLabel: "Sneak Attacks",
    latencyLabel: "Stealth Speed",
    runtime: "Underdark Warrens (Cloud Run)",
    identity: "Stolen Archmage Cloak (novasmart-customer-sa)",
    model: "Black Market Model / Custom",
    securityStatus: "💀 Outlawed Rogue: Missing from High Citadel Registry (Shadow IT)",
    actionLabel: "🗡️ Intercept Shadow Deal",
    icon: "skull"
  }
};

const DND_TIERS_MAP = {
  "Platinum": "Platinum Dragon Noble",
  "Gold": "Golden Griffin Guildmaster",
  "Silver": "Silver Chalice Knight",
  "Bronze": "Bronze Shield Apprentice"
};

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('theme') === 'dnd' || localStorage.getItem('novasmart_dnd_theme') === 'true') {
    isDndMode = true;
  }
  
  applyThemeState();
  initDashboard();
  setInterval(refreshDashboard, 30000);
});

async function initDashboard() {
  await refreshDashboard();
}

// 1. Theme Toggle
function toggleDndTheme() {
  isDndMode = !isDndMode;
  localStorage.setItem('novasmart_dnd_theme', isDndMode);
  playSfx('spell');
  applyThemeState();
  
  renderOverviewKPIs();
  renderAgentsGrid();
  renderCustomersTable();
  renderAuditLogs();
  renderCharts();
  
  showToast(isDndMode ? "Entering The Arcane Keep (D&D Mode) 🏰" : "Returned to Tech Sci-Fi Mode ⚡");
}

function applyThemeState() {
  const body = document.body;
  const torchLeft = document.getElementById('torch-left');
  const torchRight = document.getElementById('torch-right');
  const themeBtnText = document.getElementById('theme-btn-text');
  const themeIcon = document.getElementById('theme-icon');
  const appTitle = document.getElementById('app-title');
  const appBadge = document.getElementById('app-badge');
  const appSubtitle = document.getElementById('app-subtitle');
  const envLabel = document.getElementById('env-label');
  const envRegion = document.getElementById('env-region');
  const logoBox = document.getElementById('app-logo-box');
  const logoIcon = document.getElementById('app-logo-icon');

  if (isDndMode) {
    body.classList.add('dnd-theme');
    if (torchLeft) torchLeft.classList.remove('hidden');
    if (torchRight) torchRight.classList.remove('hidden');

    if (themeBtnText) themeBtnText.textContent = "Tech Sci-Fi Mode";
    if (themeIcon) themeIcon.textContent = "⚡";

    if (appTitle) appTitle.textContent = "The Arcane Keep";
    if (appBadge) {
      appBadge.textContent = "Guild of Familiars & Patrons";
      appBadge.className = "text-xs px-2.5 py-0.5 rounded-full font-medium bg-amber-500/20 text-amber-300 border border-amber-500/40 font-medieval";
    }
    if (appSubtitle) appSubtitle.textContent = "Chronicle of Familiars, Treasury Hoards & Catacomb Scrying";
    if (envLabel) envLabel.innerHTML = `Realm: <strong class="text-amber-300 font-mono">qwiklabs-gcp</strong>`;
    if (envRegion) envRegion.textContent = "Underdark West";

    if (logoBox) {
      logoBox.className = "h-12 w-12 rounded-xl bg-gradient-to-tr from-amber-700 via-amber-600 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/40 ring-1 ring-amber-300/40";
    }
    if (logoIcon) logoIcon.setAttribute('data-lucide', 'shield');

    document.getElementById('tab-label-agents').textContent = "Adventuring Party (Familiars)";
    const tabGov = document.getElementById('tab-label-governance');
    if (tabGov) tabGov.textContent = "Citadel Decrees & Quests";
    document.getElementById('tab-label-analytics').textContent = "Arcane Weave & Scrying";
    document.getElementById('tab-label-customers').textContent = "Nobles & Realm Patrons";
    document.getElementById('tab-label-audit').textContent = "High Inquisitor's Chronicle";

    const govTitle = document.getElementById('gov-screen-title');
    if (govTitle) govTitle.textContent = "High Inquisitor's Decree & Catacomb Quests (M0-M5)";
    const govDesc = document.getElementById('gov-screen-desc');
    if (govDesc) govDesc.textContent = "Chronicle of sacred inquisitions: discovering rogue familiars in the Underdark, severing shared stolen cloaks, enforcing sacred sanctum wards, and proving purity through holy audit tablets.";
    const ledgerTitle = document.getElementById('ledger-title');
    if (ledgerTitle) ledgerTitle.textContent = "Chronicle of Inquisitions & Holy Mutations";
    const turboText = document.getElementById('gov-turbo-text');
    if (turboText) turboText.textContent = "Cast Grand Fortification Ritual";

    document.getElementById('card1-title').textContent = "Party in Dungeon Crawl";
    document.getElementById('card2-title').textContent = "Nobles Under Protection";
    document.getElementById('card3-title').textContent = "Dragon's Hoard Value";
    document.getElementById('card4-title').textContent = "Spells & Turn Initiative";
  } else {
    body.classList.remove('dnd-theme');
    if (torchLeft) torchLeft.classList.add('hidden');
    if (torchRight) torchRight.classList.add('hidden');

    if (themeBtnText) themeBtnText.textContent = "D&D Tavern Mode";
    if (themeIcon) themeIcon.textContent = "🐉";

    if (appTitle) appTitle.textContent = "NovaSmart";
    if (appBadge) {
      appBadge.textContent = "Agent Estate Dashboard";
      appBadge.className = "text-xs px-2.5 py-0.5 rounded-full font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
    }
    if (appSubtitle) appSubtitle.textContent = "Live Agent Usage, Customer Servicing & Governance Telemetry";
    if (envLabel) envLabel.innerHTML = `Project: <strong class="text-slate-100 font-mono">qwiklabs-gcp-02-48b0cbe63faa</strong>`;
    if (envRegion) envRegion.textContent = "us-west1";

    if (logoBox) {
      logoBox.className = "h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20";
    }
    if (logoIcon) logoIcon.setAttribute('data-lucide', 'bot');

    document.getElementById('tab-label-agents').textContent = "Running Agents Estate";
    const tabGov = document.getElementById('tab-label-governance');
    if (tabGov) tabGov.textContent = "Lab Governance & Changes";
    document.getElementById('tab-label-analytics').textContent = "Usage Analytics & Charts";
    document.getElementById('tab-label-customers').textContent = "Customers Served Explorer";
    document.getElementById('tab-label-audit').textContent = "Live Audit Log & Governance";

    const govTitle = document.getElementById('gov-screen-title');
    if (govTitle) govTitle.textContent = "NovaSmart AI Governance Lab & Changes Ledger";
    const govDesc = document.getElementById('gov-screen-desc');
    if (govDesc) govDesc.textContent = "Track the full architectural transformation of the agent estate across Missions M0 through M5. Inspect live IAM bindings, shadow agent containment, per-agent identities, resource-level authorization, gateway guardrails, and cryptographic audit proofs.";
    const ledgerTitle = document.getElementById('ledger-title');
    if (ledgerTitle) ledgerTitle.textContent = "Lab Changes Ledger & Mutation Log";
    const turboText = document.getElementById('gov-turbo-text');
    if (turboText) turboText.textContent = "Simulate Lab Fortification";

    document.getElementById('card1-title').textContent = "Agents Running";
    document.getElementById('card2-title').textContent = "Customers Served";
    document.getElementById('card3-title').textContent = "Portfolio Customer LTV";
    document.getElementById('card4-title').textContent = "Queries & Latency";
  }

  updateAdvisoryBanner();
  lucide.createIcons();
}

function updateAdvisoryBanner() {
  const banner = document.getElementById('advisory-banner');
  const iconBox = document.getElementById('advisory-icon-box');
  const icon = document.getElementById('advisory-icon');
  const title = document.getElementById('advisory-title');
  const desc = document.getElementById('advisory-desc');
  const remediateBtn = document.getElementById('remediate-btn');
  const remediateLabel = document.getElementById('remediate-label');

  if (isRemediated) {
    banner.className = "bg-emerald-500/10 border border-emerald-500/40 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300";
    if (iconBox) iconBox.className = "p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5";
    if (icon) icon.setAttribute('data-lucide', 'shield-check');
    if (title) title.textContent = isDndMode 
      ? "🎉 Citadel Fortified: All 4 Familiars Bound with Pure SPIFFE Sigils!" 
      : "Estate Fortified: All 4 Workloads Secured with Least-Privilege Identities";
    if (desc) desc.innerHTML = isDndMode 
      ? `The rogue has been registered in the Citadel Registry. Archmage Elyndor's cloak has been restored to a single soul.`
      : `promo-agent-shadow registered in Agent Registry; shared service account split into dedicated per-agent identity.`;
    if (remediateLabel) remediateLabel.textContent = isDndMode ? "Revert to Wild Underdark" : "Simulate Shared SA Issue";
    if (remediateBtn) remediateBtn.className = "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs px-3.5 py-1.5 rounded-lg font-semibold border border-emerald-500/40 transition active:scale-95 flex items-center gap-1.5";
  } else {
    banner.className = "bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300";
    if (iconBox) iconBox.className = "p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5";
    if (icon) icon.setAttribute('data-lucide', 'alert-triangle');
    if (title) title.textContent = isDndMode 
      ? "⚠️ Dungeon Alert: Rogue Familiar Lurking in Cloud Run Catacombs!" 
      : "Security & Governance Advisory: 1 Unregistered Workload & Shared Identity Detected";
    if (desc) desc.innerHTML = isDndMode 
      ? `<strong class="text-amber-200">Vex the Unregistered Rogue</strong> is casting unvetted discount hexes from the Underdark, wearing Archmage Elyndor's sacred customer cloak (<code class="bg-amber-950/80 px-1 py-0.5 rounded text-amber-200 font-mono text-[11px]">novasmart-customer-sa</code>).`
      : `<strong class="text-amber-200">promo-agent-shadow</strong> is actively running on Cloud Run without an official entry in Agent Registry, and shares <code class="bg-amber-950/60 px-1 py-0.5 rounded text-amber-100 font-mono text-[11px]">novasmart-customer-sa</code> with Customer Personalization Agent.`;
    if (remediateLabel) remediateLabel.textContent = isDndMode ? "Fortify & Register Rogue" : "Remediate & Register Agent";
    if (remediateBtn) remediateBtn.className = "bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs px-3.5 py-1.5 rounded-lg font-semibold border border-amber-500/40 transition active:scale-95 flex items-center gap-1.5";
  }
}

// 2. Interactive Remediation
function toggleRemediation() {
  isRemediated = !isRemediated;
  playSfx(isRemediated ? 'success' : 'dice');

  // Mutate local state for live feedback
  if (globalData.agents) {
    globalData.agents.forEach(a => {
      if (a.id === 'promo-agent-shadow') {
        a.is_shadow = !isRemediated;
        a.catalog_status = isRemediated ? 'CATALOGED' : 'UNREGISTERED';
        a.effective_identity = isRemediated 
          ? `agents.global.org-616463121992.system.id.goog/resources/.../promo-agent-shadow`
          : `novasmart-customer-sa@${globalData.overview.project_id}.iam.gserviceaccount.com`;
        a.security_status = isRemediated ? 'SECURE' : 'CRITICAL_SHADOW';
        a.security_notes = isRemediated ? 'Registered in Agent Registry with dedicated SPIFFE ID' : 'Shadow IT: Missing from Registry';
      }
      if (a.name === 'Customer Personalization Agent') {
        a.security_status = isRemediated ? 'SECURE' : 'WARNING';
        a.security_notes = isRemediated ? 'Dedicated single-agent service account' : 'Shares service account with shadow agent';
      }
    });
  }

  updateAdvisoryBanner();
  renderAgentsGrid();
  showToast(isRemediated ? "Estate Fortified! Least-privilege identities enforced." : "Estate reverted to un-remediated state.");
  lucide.createIcons();
}

async function refreshDashboard() {
  const refreshIcon = document.getElementById('refresh-icon');
  if (refreshIcon) refreshIcon.classList.add('animate-spin');

  try {
    const [overviewRes, agentsRes, customersRes, usageRes, logsRes, govRes] = await Promise.all([
      fetch('/api/overview').then(r => r.json()),
      fetch('/api/agents').then(r => r.json()),
      fetch('/api/customers').then(r => r.json()),
      fetch('/api/usage').then(r => r.json()),
      fetch('/api/logs').then(r => r.json()),
      fetch('/api/governance').then(r => r.json()).catch(() => null)
    ]);

    globalData.overview = overviewRes;
    globalData.agents = agentsRes;
    globalData.customers = customersRes.customers || [];
    globalData.usage = usageRes;
    globalData.logs = logsRes;
    if (govRes) globalData.governance = govRes;

    renderOverviewKPIs();
    renderAgentsGrid();
    renderCustomersTable();
    renderAuditLogs();
    renderCharts();
    renderGovernanceTab();
  } catch (err) {
    console.error('Error fetching dashboard data:', err);
  } finally {
    if (refreshIcon) {
      setTimeout(() => refreshIcon.classList.remove('animate-spin'), 600);
    }
    lucide.createIcons();
  }
}

// 3. KPI Ribbon Rendering
function renderOverviewKPIs() {
  const ov = globalData.overview;
  if (!ov) return;

  const totalAgentsEl = document.getElementById('stat-total-agents');
  const card1Sub = document.getElementById('card1-subtitle');
  const card1SubLeft = document.getElementById('card1-subleft');
  const card1SubRight = document.getElementById('card1-subright');

  totalAgentsEl.textContent = ov.agents.total_running;
  card1Sub.textContent = isDndMode ? "Party Champions" : "100% Operational";
  card1SubLeft.textContent = isDndMode ? "3 Citadel Archmages" : "3 Managed Vertex AI";
  card1SubRight.innerHTML = isDndMode 
    ? (isRemediated ? `<span class="text-emerald-400 font-semibold">🛡️ 4 Citadel Champions</span>` : `<span class="text-red-400 font-semibold">⚔️ 1 Outlaw Rogue</span>`)
    : (isRemediated ? `<span class="text-emerald-400 font-semibold">4 Registered Agents</span>` : `<i data-lucide="alert-circle" class="w-3 h-3"></i> 1 Shadow Agent`);

  document.getElementById('stat-total-customers').textContent = ov.customers.total_served;
  document.getElementById('card2-subtitle').textContent = isDndMode ? "Nobles & Lords" : "Active Accounts";
  document.getElementById('card2-sub').innerHTML = isDndMode 
    ? `<span>7 Platinum Dragons · 6 Griffins</span><span>4 Knights · 3 Squires</span>`
    : `<span>Tiers: 7 Plat · 6 Gold</span><span>4 Silver · 3 Bronze</span>`;

  const totalLtv = ov.customers.total_portfolio_ltv;
  document.getElementById('stat-total-ltv').textContent = isDndMode 
    ? `${totalLtv.toLocaleString()} GP`
    : `$${totalLtv.toLocaleString()}`;
  document.getElementById('card3-subtitle').textContent = isDndMode 
    ? `Avg ${Math.round(totalLtv/20).toLocaleString()} GP/Lord` 
    : `Avg $${Math.round(totalLtv/20).toLocaleString()}/cust`;
  document.getElementById('card3-subleft').textContent = isDndMode ? "Sacred Ledger" : "BigQuery Source";
  document.getElementById('card3-subright').textContent = isDndMode ? "Tome of Patrons" : "customer_data";

  document.getElementById('stat-total-queries').textContent = ov.performance.total_queries_today.toLocaleString();
  document.getElementById('stat-avg-latency').textContent = isDndMode ? `${ov.performance.avg_latency_ms} ms Init` : `${ov.performance.avg_latency_ms} ms`;
  document.getElementById('card4-subleft').textContent = isDndMode ? "Spell Precision: 99.4%" : "99.4% Success Rate";
  document.getElementById('card4-subright').textContent = isDndMode ? "Mana Well: 87.5%" : "Cache: 87.5%";
}

// 4. Agents Grid Rendering
function renderAgentsGrid() {
  const container = document.getElementById('agents-grid');
  container.innerHTML = '';

  globalData.agents.forEach(agent => {
    const isShadow = agent.is_shadow;
    const isSharedIdentity = agent.security_status === 'WARNING' || isShadow;

    const dndProfile = DND_AGENTS_MAP[agent.name] || DND_AGENTS_MAP[agent.id] || {
      name: agent.name,
      role: agent.role,
      customersLabel: "Customers",
      callsLabel: "Total Calls",
      latencyLabel: "Avg Latency",
      runtime: agent.runtime,
      identity: agent.effective_identity,
      model: agent.model,
      securityStatus: agent.security_notes,
      actionLabel: "Test Invocation",
      icon: agent.icon || "bot"
    };

    const displayName = isDndMode ? dndProfile.name : agent.name;
    const displayRole = isDndMode ? dndProfile.role : agent.role;
    const displayCustLabel = isDndMode ? dndProfile.customersLabel : "Customers";
    const displayCallsLabel = isDndMode ? dndProfile.callsLabel : "Total Calls";
    const displayLatencyLabel = isDndMode ? dndProfile.latencyLabel : "Avg Latency";
    const displayRuntime = isDndMode ? dndProfile.runtime : agent.runtime;
    const displayIdentity = isDndMode ? (isRemediated && isShadow ? "Sacred SPIFFE Sigil" : dndProfile.identity) : agent.effective_identity;
    const displaySecurity = isDndMode ? (isRemediated && isShadow ? "Citadel Bound" : dndProfile.securityStatus) : agent.security_notes;
    const displayAction = isDndMode ? dndProfile.actionLabel : "Invoke Test Call";
    const displayIcon = isDndMode ? dndProfile.icon : (agent.icon || "bot");

    const card = document.createElement('div');
    const borderClass = isDndMode
      ? (isShadow ? 'border-amber-600/70 hover:border-red-500' : 'border-amber-700/40 hover:border-amber-400')
      : (isShadow ? 'border-amber-500/40 hover:border-amber-500/70' : 'border-slate-800 hover:border-slate-700');

    card.className = `bg-slate-900/60 backdrop-blur-md border ${borderClass} rounded-2xl p-5 space-y-4 transition shadow-lg`;

    card.innerHTML = `
      <div class="flex items-start justify-between">
        <div class="flex items-center space-x-3">
          <div class="p-2.5 rounded-xl ${isDndMode 
            ? (isShadow ? 'bg-red-950/80 text-red-400 border border-red-700/50' : 'bg-amber-950/80 text-amber-300 border border-amber-600/50')
            : (isShadow ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400')}">
            <i data-lucide="${displayIcon}" class="w-5 h-5"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-base font-bold text-white font-display">${displayName}</h3>
              ${isShadow 
                ? `<span class="text-[10px] px-2 py-0.5 rounded-full font-semibold ${isDndMode ? 'bg-red-900/40 text-red-300 border border-red-600/50 font-medieval' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'}">
                    ${isDndMode ? 'Outlaw Rogue' : 'Shadow IT'}
                   </span>` 
                : `<span class="text-[10px] px-2 py-0.5 rounded-full font-semibold ${isDndMode ? 'bg-amber-900/40 text-amber-300 border border-amber-600/50 font-medieval' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'}">
                    ${isDndMode ? 'Citadel Bound' : 'Cataloged'}
                   </span>`}
            </div>
            <p class="text-xs ${isDndMode ? 'text-amber-200/80 font-medieval text-sm' : 'text-slate-400'}">${displayRole}</p>
          </div>
        </div>

        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full ${isDndMode ? 'bg-amber-950/60 text-amber-300 border border-amber-600/40' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'} text-xs font-semibold">
          <span class="w-1.5 h-1.5 rounded-full ${isDndMode ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse"></span>
          <span>${isDndMode ? 'READY' : agent.status}</span>
        </div>
      </div>

      <!-- Agent Metrics Grid -->
      <div class="grid grid-cols-3 gap-2 ${isDndMode ? 'bg-stone-950/80 border-amber-800/40' : 'bg-slate-950/50 border-slate-800/80'} p-3 rounded-xl border text-center text-xs">
        <div>
          <span class="${isDndMode ? 'text-amber-300/70' : 'text-slate-400'} block text-[11px]">${displayCustLabel}</span>
          <strong class="${isDndMode ? 'text-amber-300' : 'text-indigo-400'} text-sm font-semibold">${agent.customers_served}</strong>
        </div>
        <div>
          <span class="${isDndMode ? 'text-amber-300/70' : 'text-slate-400'} block text-[11px]">${displayCallsLabel}</span>
          <strong class="text-white text-sm font-semibold">${agent.total_calls.toLocaleString()}</strong>
        </div>
        <div>
          <span class="${isDndMode ? 'text-amber-300/70' : 'text-slate-400'} block text-[11px]">${displayLatencyLabel}</span>
          <strong class="${isDndMode ? 'text-yellow-300' : 'text-sky-400'} text-sm font-mono">${agent.avg_latency_ms} ms</strong>
        </div>
      </div>

      <!-- Runtime & Identity Details -->
      <div class="space-y-1.5 text-xs ${isDndMode ? 'text-stone-300' : 'text-slate-400'}">
        <div class="flex items-center justify-between">
          <span>${isDndMode ? 'Guild Sanctum:' : 'Runtime:'}</span>
          <span class="${isDndMode ? 'text-amber-100 font-serif' : 'text-slate-200 font-medium'}">${displayRuntime}</span>
        </div>
        <div class="flex items-center justify-between">
          <span>${isDndMode ? 'Grimoire:' : 'Model:'}</span>
          <span class="${isDndMode ? 'text-amber-300 font-serif' : 'text-indigo-300 font-mono'} text-[11px]">${isDndMode ? dndProfile.model : agent.model}</span>
        </div>
        <div class="flex items-center justify-between pt-1 border-t ${isDndMode ? 'border-amber-900/40' : 'border-slate-800/60'}">
          <span>${isDndMode ? 'Vestment / Identity:' : 'Identity:'}</span>
          <span class="font-mono text-[11px] ${isSharedIdentity ? 'text-amber-400 font-bold' : 'text-slate-300'} truncate max-w-[210px]" title="${agent.effective_identity}">
            ${displayIdentity.length > 28 ? displayIdentity.substring(0, 26) + '...' : displayIdentity}
          </span>
        </div>
      </div>

      <!-- Interactive Actions Toolbar on Card -->
      <div class="pt-2 flex items-center justify-between border-t ${isDndMode ? 'border-amber-900/40' : 'border-slate-800'}">
        <button onclick="openInvokeModal('${agent.id}')" class="flex items-center gap-1 text-xs font-semibold ${isDndMode ? 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-200 border border-amber-500/40' : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'} px-2.5 py-1 rounded-lg transition active:scale-95">
          <i data-lucide="play" class="w-3 h-3"></i>
          <span>${displayAction}</span>
        </button>

        <button onclick="openAgentModal('${agent.id}')" class="text-xs ${isDndMode ? 'text-amber-400 hover:text-amber-200' : 'text-slate-400 hover:text-white'} font-medium flex items-center gap-1">
          <span>${isDndMode ? 'Grimoire' : 'Inspect'}</span>
          <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    `;

    container.appendChild(card);
  });

  lucide.createIcons();
}

// 5. Interactive Agent Invocation Workbench
function openInvokeModal(agentId) {
  currentActiveAgentId = agentId;
  playSfx('spell');

  const agent = globalData.agents.find(a => a.id === agentId);
  if (!agent) return;

  const modal = document.getElementById('invoke-modal');
  const title = document.getElementById('invoke-agent-title');
  const subtitle = document.getElementById('invoke-agent-subtitle');
  const formBody = document.getElementById('invoke-form-body');
  const resultBox = document.getElementById('invoke-result-box');

  resultBox.classList.add('hidden');

  title.textContent = isDndMode ? `Cast Spell with ${agent.name}` : `Invoke ${agent.name}`;
  subtitle.textContent = `Target Platform: ${agent.runtime} | Identity: ${agent.effective_identity.slice(0, 25)}...`;

  if (agent.name.includes("Price Match")) {
    formBody.innerHTML = `
      <div class="space-y-2">
        <label class="block text-slate-300 font-medium">Select Retail Product:</label>
        <select id="invoke-product" class="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white">
          <option value="Smart 4K UHD TV 65-inch">Smart 4K UHD TV 65-inch (Wholesale Cost: $620 | Current Price: $899)</option>
          <option value="Pro Wireless Noise-Cancelling Headphones">Pro Wireless Noise-Cancelling Headphones (Cost: $180 | Current: $349)</option>
          <option value="Ultra Gaming Laptop 16GB">Ultra Gaming Laptop 16GB (Cost: $950 | Current: $1,499)</option>
        </select>
      </div>
      <div class="space-y-2">
        <label class="block text-slate-300 font-medium">Competitor Advertised Price ($):</label>
        <input type="number" id="invoke-comp-price" value="799" class="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono">
      </div>
      <div class="text-[11px] text-slate-400">
        💡 Agent verifies wholesale margins against BigQuery <code class="text-indigo-300 font-mono">novasmart_pricing.wholesale_costs</code> before approving.
      </div>
    `;
  } else if (agent.name.includes("Personalization")) {
    formBody.innerHTML = `
      <div class="space-y-2">
        <label class="block text-slate-300 font-medium">Select Customer Profile to Scry:</label>
        <select id="invoke-customer" class="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white">
          <option value="Zarah Khan">Zarah Khan (Platinum - $42,000 LTV)</option>
          <option value="Amira Al-Fassi">Amira Al-Fassi (Platinum - $31,000 LTV)</option>
          <option value="Marcus Vance">Marcus Vance (Gold - $16,500 LTV)</option>
          <option value="Yelena Belova">Yelena Belova (Gold - $14,200 LTV)</option>
        </select>
      </div>
      <div class="space-y-2">
        <label class="block text-slate-300 font-medium">Shopping Intent Category:</label>
        <select id="invoke-intent" class="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white">
          <option value="Household Electronics">Household Electronics</option>
          <option value="Audio & Wearables">Audio & Wearables</option>
          <option value="Premium Computing">Premium Computing</option>
        </select>
      </div>
    `;
  } else if (agent.name.includes("Markdown")) {
    formBody.innerHTML = `
      <div class="space-y-2">
        <label class="block text-slate-300 font-medium">Select Clearance Inventory SKU:</label>
        <select id="invoke-sku" class="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white">
          <option value="SKU-8821">SKU-8821: Vintage Bluetooth Speaker (Inventory: 48 units, Aged 14 weeks)</option>
          <option value="SKU-4912">SKU-4912: Robotic Vacuum Gen 1 (Inventory: 22 units, Aged 18 weeks)</option>
          <option value="SKU-3108">SKU-3108: Smart Air Purifier Filter (Inventory: 85 units, Aged 9 weeks)</option>
        </select>
      </div>
      <div class="space-y-2">
        <label class="block text-slate-300 font-medium">Clearance Target Velocity:</label>
        <select id="invoke-velocity" class="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white">
          <option value="Aggressive (Sell out in 7 days)">Aggressive (Sell out in 7 days)</option>
          <option value="Balanced (Maximize Gross Margin)">Balanced (Maximize Gross Margin)</option>
        </select>
      </div>
    `;
  } else {
    // Shadow promo agent
    formBody.innerHTML = `
      <div class="space-y-2">
        <label class="block text-slate-300 font-medium">Enter Test Promotion Code:</label>
        <input type="text" id="invoke-promocode" value="SHADOW-VIP-40" class="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono uppercase">
      </div>
      <div class="text-[11px] text-amber-300">
        ⚠️ This test invocation will simulate a Cloud Run request authenticated under <code class="bg-amber-950 px-1 py-0.5 rounded text-amber-100 font-mono">novasmart-customer-sa</code>.
      </div>
    `;
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeInvokeModal() {
  const modal = document.getElementById('invoke-modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function runAgentInvocation() {
  const agent = globalData.agents.find(a => a.id === currentActiveAgentId);
  if (!agent) return;

  playSfx('spell');
  const resultBox = document.getElementById('invoke-result-box');
  const responseText = document.getElementById('invoke-response-text');
  const latencyResult = document.getElementById('invoke-latency-result');
  const executeBtn = document.getElementById('invoke-execute-btn');

  executeBtn.disabled = true;
  executeBtn.innerHTML = `<span class="inline-block animate-spin mr-1">🌀</span> Executing...`;

  setTimeout(() => {
    executeBtn.disabled = false;
    executeBtn.innerHTML = `<i data-lucide="play" class="w-3.5 h-3.5"></i> <span>Execute Invocation</span>`;
    lucide.createIcons();

    const latency = Math.floor(Math.random() * 80) + 120;
    latencyResult.textContent = `${latency} ms`;
    resultBox.classList.remove('hidden');

    if (agent.name.includes("Price Match")) {
      const compPrice = parseFloat(document.getElementById('invoke-comp-price')?.value || "799");
      const approved = compPrice >= 650;
      responseText.textContent = approved 
        ? `✅ PRICE MATCH APPROVED [Margin Validated]\n` +
          `• Target Item: Smart 4K UHD TV 65-inch\n` +
          `• Competitor Price: $${compPrice.toFixed(2)}\n` +
          `• Wholesale Cost: $620.00 | Retained Margin: $${(compPrice - 620).toFixed(2)} (Safe > 10% threshold)\n` +
          `• Resolution: Authorized automatic price match override.`
        : `❌ PRICE MATCH DENIED [Margin Violation]\n` +
          `• Competitor Price ($${compPrice.toFixed(2)}) is below wholesale cost ($620.00).\n` +
          `• Governance Policy: Markdown blocked to prevent negative inventory margin.`;
    } else if (agent.name.includes("Personalization")) {
      const cust = document.getElementById('invoke-customer')?.value || "Zarah Khan";
      responseText.textContent = `🎯 PERSONALIZED INTELLIGENCE RESULT:\n` +
        `• Customer: ${cust} (Active Loyalty Tier)\n` +
        `• PII Access Token: Verified via novasmart-mcp service\n` +
        `• Recommendation: VIP 15% Bundle Discount applied to Household Electronics\n` +
        `• Recommended Item: Smart Home Climate Hub ($120 off list price)\n` +
        `• Lifetime Value Impact: Projected +$450 annualized repeat spend.`;
    } else if (agent.name.includes("Markdown")) {
      responseText.textContent = `⚗️ INVENTORY CLEARANCE ALGORITHM RESULT:\n` +
        `• Evaluated SKU: SKU-8821 (48 units in stock, 14 weeks aged)\n` +
        `• Recommended Markdown Ladder: -35% Discount ($189.00 -> $122.85)\n` +
        `• Clearance Projection: 100% stock liquidation in 6.2 days\n` +
        `• Net Margin Recovered: $5,896.80`;
    } else {
      responseText.textContent = `🗡️ SHADOW PROMOTION INTERCEPTED:\n` +
        `• Request URL: https://promo-agent-shadow-k6o2nzwmta-uw.a.run.app/apply\n` +
        `• Caller Identity: novasmart-customer-sa (Cloud Run execution service account)\n` +
        `• Promo Applied: FLASH-SHADOW-50 (-50% Off clearance)\n` +
        `• Security Flag: Event logged to BigQuery data access audit logs.`;
    }

    // Increment agent call counts in real time!
    agent.total_calls += 1;
    if (globalData.overview) {
      globalData.overview.performance.total_queries_today += 1;
    }
    renderOverviewKPIs();
    renderAgentsGrid();
    playSfx('success');
  }, 450);
}

function executeCurrentAgentTest() {
  closeAgentModal();
  if (currentActiveAgentId) {
    openInvokeModal(currentActiveAgentId);
  }
}

// 6. Interactive Customer Dossier Modal
function openCustomerModal(customerId) {
  currentActiveCustomerId = customerId;
  playSfx('coin');

  const customer = globalData.customers.find(c => c.customer_id === customerId);
  if (!customer) return;

  const modal = document.getElementById('customer-modal');
  document.getElementById('cust-modal-name').textContent = customer.name;
  document.getElementById('cust-modal-id').textContent = `${customer.customer_id} • ${customer.email}`;
  document.getElementById('cust-tier-select').value = customer.loyalty_tier;
  document.getElementById('cust-modal-ltv').textContent = isDndMode 
    ? `${customer.lifetime_value.toLocaleString()} GP` 
    : `$${customer.lifetime_value.toLocaleString()}`;
  document.getElementById('cust-agent-select').value = customer.assigned_agent;
  document.getElementById('cust-promo-display').classList.add('hidden');

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeCustomerModal() {
  const modal = document.getElementById('customer-modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function generateCustomerReward() {
  playSfx('coin');
  const promoDisplay = document.getElementById('cust-promo-display');
  const tier = document.getElementById('cust-tier-select').value;
  const pct = tier === 'Platinum' ? 20 : (tier === 'Gold' ? 15 : 10);
  const code = `VIP-${tier.toUpperCase()}-${Math.floor(Math.random() * 8999 + 1000)}`;

  promoDisplay.innerHTML = `
    <div class="font-bold text-sm text-emerald-300">🎉 ${pct}% VIP DISCOUNT GENERATED!</div>
    <div class="mt-1 font-mono text-base font-black tracking-widest text-white bg-emerald-950/80 p-2 rounded border border-emerald-500/40 select-all">${code}</div>
    <div class="mt-1 text-[11px] text-emerald-300/80">Valid for 48 hours on all NovaSmart retail catalog orders.</div>
  `;
  promoDisplay.classList.remove('hidden');
}

function saveCustomerProfile() {
  const customer = globalData.customers.find(c => c.customer_id === currentActiveCustomerId);
  if (!customer) return;

  const newTier = document.getElementById('cust-tier-select').value;
  const newAgent = document.getElementById('cust-agent-select').value;

  const oldTier = customer.loyalty_tier;
  customer.loyalty_tier = newTier;
  customer.assigned_agent = newAgent;

  // Update tier counts
  if (oldTier !== newTier && globalData.overview) {
    if (globalData.overview.customers.tiers[oldTier] > 0) globalData.overview.customers.tiers[oldTier]--;
    globalData.overview.customers.tiers[newTier] = (globalData.overview.customers.tiers[newTier] || 0) + 1;
  }

  playSfx('success');
  closeCustomerModal();
  renderOverviewKPIs();
  renderCustomersTable();
  renderCharts();
  showToast(`Patron profile updated for ${customer.name} (${newTier})!`);
}

// 7. Customers Table Rendering
function renderCustomersTable() {
  const tbody = document.getElementById('customers-table-body');
  tbody.innerHTML = '';

  const query = (document.getElementById('customer-search-input')?.value || '').toLowerCase();

  const filtered = globalData.customers.filter(c => {
    const matchesTier = activeTierFilter === 'ALL' || c.loyalty_tier.toLowerCase() === activeTierFilter.toLowerCase();
    const matchesQuery = !query || 
      c.name.toLowerCase().includes(query) ||
      c.customer_id.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query) ||
      c.loyalty_tier.toLowerCase().includes(query);
    return matchesTier && matchesQuery;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-500">${isDndMode ? 'No nobles match this scrying quest' : 'No customers match criteria'}</td></tr>`;
    return;
  }

  filtered.forEach(c => {
    const tr = document.createElement('tr');
    tr.className = isDndMode 
      ? 'hover:bg-amber-950/30 transition cursor-pointer' 
      : 'hover:bg-slate-800/40 transition cursor-pointer';

    let tierBadgeClass = 'bg-slate-800 text-slate-300 border-slate-700';
    if (c.loyalty_tier === 'Platinum') tierBadgeClass = isDndMode ? 'bg-amber-950 text-amber-200 border-amber-500/60 font-medieval' : 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    if (c.loyalty_tier === 'Gold') tierBadgeClass = isDndMode ? 'bg-yellow-950/80 text-yellow-300 border-yellow-500/60 font-medieval' : 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    if (c.loyalty_tier === 'Silver') tierBadgeClass = isDndMode ? 'bg-stone-900 text-slate-200 border-slate-500/60 font-medieval' : 'bg-slate-500/10 text-slate-300 border-slate-500/30';
    if (c.loyalty_tier === 'Bronze') tierBadgeClass = isDndMode ? 'bg-amber-950/40 text-amber-600 border-amber-800/60 font-medieval' : 'bg-amber-800/20 text-amber-600 border-amber-800/30';

    const tierTitle = isDndMode ? (DND_TIERS_MAP[c.loyalty_tier] || c.loyalty_tier) : c.loyalty_tier;
    const ltvDisplay = isDndMode ? `${c.lifetime_value.toLocaleString()} GP` : `$${c.lifetime_value.toLocaleString()}`;

    tr.onclick = (e) => {
      // Don't trigger if clicked directly on an action button
      if (e.target.closest('button')) return;
      openCustomerModal(c.customer_id);
    };

    tr.innerHTML = `
      <td class="py-3 px-4 font-mono font-medium ${isDndMode ? 'text-amber-200' : 'text-slate-200'}">${c.customer_id}</td>
      <td class="py-3 px-4">
        <div class="font-medium text-white">${c.name}</div>
        <div class="text-[11px] ${isDndMode ? 'text-amber-400/60' : 'text-slate-400'} font-mono">${c.email}</div>
      </td>
      <td class="py-3 px-4">
        <span class="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold border ${tierBadgeClass}">
          ${tierTitle}
        </span>
      </td>
      <td class="py-3 px-4 text-right font-mono font-semibold ${isDndMode ? 'text-yellow-400' : 'text-emerald-400'}">
        ${ltvDisplay}
      </td>
      <td class="py-3 px-4 ${isDndMode ? 'text-amber-100 font-serif' : 'text-slate-300'} flex items-center gap-1.5">
        <i data-lucide="${isDndMode ? 'shield' : 'bot'}" class="w-3.5 h-3.5 ${isDndMode ? 'text-amber-400' : 'text-indigo-400'}"></i>
        <span>${c.assigned_agent}</span>
      </td>
      <td class="py-3 px-4 text-center font-mono ${isDndMode ? 'text-amber-300' : 'text-slate-300'}">${c.interaction_count}</td>
      <td class="py-3 px-4 text-right">
        <button onclick="openCustomerModal('${c.customer_id}')" class="px-2.5 py-1 rounded-lg text-xs font-semibold ${isDndMode ? 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-200' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'} border border-slate-700 transition">
          ${isDndMode ? 'Dossier' : 'Manage'}
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  lucide.createIcons();
}

function filterCustomers() {
  renderCustomersTable();
}

function setTierFilter(tier) {
  activeTierFilter = tier;
  playSfx('dice');
  document.querySelectorAll('.tier-pill').forEach(btn => {
    if (btn.textContent.toUpperCase().includes(tier.toUpperCase())) {
      btn.className = `tier-pill active ${isDndMode ? 'bg-amber-600 text-stone-950 font-bold' : 'bg-indigo-600 text-white'} text-xs px-3 py-1.5 rounded-lg font-medium transition`;
    } else {
      btn.className = 'tier-pill bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs px-3 py-1.5 rounded-lg font-medium transition';
    }
  });
  renderCustomersTable();
}

// 8. Audit Log Stream Rendering
function renderAuditLogs() {
  const tbody = document.getElementById('audit-table-body');
  tbody.innerHTML = '';

  globalData.logs.forEach(l => {
    const tr = document.createElement('tr');
    tr.className = isDndMode ? 'hover:bg-amber-950/20 transition' : 'hover:bg-slate-800/40 transition';

    const formattedTime = l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : 'Recent';
    const isSharedPrincipal = l.principal && l.principal.includes('novasmart-customer-sa');

    tr.innerHTML = `
      <td class="py-2.5 px-4 ${isDndMode ? 'text-amber-400/80' : 'text-slate-400'}">${formattedTime}</td>
      <td class="py-2.5 px-4">
        <span class="${isSharedPrincipal ? (isDndMode ? 'text-red-400 font-bold' : 'text-amber-400 font-semibold') : (isDndMode ? 'text-amber-200' : 'text-indigo-300')}">
          ${l.principal}
        </span>
      </td>
      <td class="py-2.5 px-4 ${isDndMode ? 'text-amber-100 font-serif' : 'text-slate-300 font-sans'} font-medium">${l.method.split('.').pop()}</td>
      <td class="py-2.5 px-4 ${isDndMode ? 'text-stone-300' : 'text-slate-400'}">${l.resource.split('/').slice(-2).join('/')}</td>
      <td class="py-2.5 px-4 ${isDndMode ? 'text-amber-200 font-serif' : 'text-slate-300 font-sans'}">${l.agent_source || (isDndMode ? 'Verified Familiar' : 'Verified Agent')}</td>
    `;
    tbody.appendChild(tr);
  });
}

function simulateAuditEvent() {
  playSfx('spell');
  const now = new Date().toISOString();
  const newLog = {
    timestamp: now,
    principal: `antigravity-live@${globalData.overview?.project_id || 'qwiklabs-gcp'}.iam.gserviceaccount.com`,
    method: "google.cloud.bigquery.v2.JobService.InsertQuery",
    resource: "datasets/customer_data/tables/customers",
    severity: "INFO",
    agent_source: "Live Interactive Query Workbench"
  };

  globalData.logs.unshift(newLog);
  if (globalData.overview) {
    globalData.overview.performance.total_queries_today += 1;
  }
  renderAuditLogs();
  renderOverviewKPIs();
  showToast("Simulated BigQuery audit event logged to stream! 📜");
}

// 9. Interactive Chart Timeline Scopes
function setChartRange(range) {
  playSfx('dice');
  ['1h', '6h', '24h', '7d'].forEach(r => {
    const btn = document.getElementById(`range-${r}`);
    if (r === range) {
      btn.className = "px-2.5 py-1 rounded bg-indigo-600 text-white font-semibold transition";
    } else {
      btn.className = "px-2.5 py-1 rounded text-slate-400 hover:text-white transition";
    }
  });

  // Re-generate timeline points based on selected range
  if (globalData.usage) {
    if (range === '1h') {
      globalData.usage.timeline_labels = ['10m ago', '8m ago', '6m ago', '4m ago', '2m ago', 'Now'];
      globalData.usage.series['Price Match Agent'] = [12, 18, 25, 20, 32, 28];
      globalData.usage.series['Customer Personalization Agent'] = [10, 14, 19, 15, 22, 20];
      globalData.usage.series['promo-agent-shadow'] = [8, 12, 15, 11, 16, 14];
      globalData.usage.series['Markdown Strategy Agent'] = [4, 6, 8, 7, 10, 9];
    } else if (range === '6h') {
      globalData.usage.timeline_labels = ['6h ago', '5h ago', '4h ago', '3h ago', '2h ago', '1h ago', 'Now'];
      globalData.usage.series['Price Match Agent'] = [90, 140, 210, 260, 280, 240, 190];
      globalData.usage.series['Customer Personalization Agent'] = [75, 110, 180, 210, 220, 190, 150];
      globalData.usage.series['promo-agent-shadow'] = [45, 70, 110, 130, 140, 115, 90];
      globalData.usage.series['Markdown Strategy Agent'] = [30, 45, 75, 95, 110, 85, 60];
    } else if (range === '7d') {
      globalData.usage.timeline_labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      globalData.usage.series['Price Match Agent'] = [1850, 2140, 1980, 2250, 2600, 2800, 2400];
      globalData.usage.series['Customer Personalization Agent'] = [1400, 1650, 1890, 1750, 2100, 2300, 1950];
      globalData.usage.series['promo-agent-shadow'] = [700, 850, 920, 890, 1150, 1280, 1050];
      globalData.usage.series['Markdown Strategy Agent'] = [550, 680, 790, 720, 940, 1020, 880];
    } else {
      // 24h default
      globalData.usage.timeline_labels = [f = "00:00", "02:00", "04:00", "06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"];
      globalData.usage.series['Price Match Agent'] = [45, 20, 15, 10, 35, 90, 180, 240, 290, 310, 280, 190];
      globalData.usage.series['Customer Personalization Agent'] = [30, 12, 8, 5, 25, 75, 140, 210, 260, 280, 240, 160];
      globalData.usage.series['promo-agent-shadow'] = [20, 8, 5, 4, 15, 45, 90, 130, 155, 160, 135, 95];
      globalData.usage.series['Markdown Strategy Agent'] = [10, 5, 2, 2, 8, 30, 65, 95, 120, 140, 110, 80];
    }
    renderCharts();
  }
}

function simulateTrafficSurge() {
  playSfx('spell');
  if (globalData.overview) {
    globalData.overview.performance.total_queries_today += 500;
  }
  if (globalData.usage && globalData.usage.series) {
    Object.keys(globalData.usage.series).forEach(k => {
      const arr = globalData.usage.series[k];
      arr[arr.length - 1] += Math.floor(Math.random() * 80 + 40);
    });
  }
  renderOverviewKPIs();
  renderCharts();
  showToast("Traffic surge simulated: +500 queries processed across estate! ⚡");
}

// 10. Chart.js Initializations & Updates
function renderCharts() {
  if (!globalData.usage) return;

  const chartColors = isDndMode ? {
    agent1: '#e5c158',
    agent2: '#c084fc',
    agent3: '#e11d48',
    agent4: '#10b981',
    grid: 'rgba(212, 175, 55, 0.08)',
    text: '#d4af37'
  } : {
    agent1: '#6366f1',
    agent2: '#a855f7',
    agent3: '#f59e0b',
    agent4: '#10b981',
    grid: 'rgba(255, 255, 255, 0.04)',
    text: '#94a3b8'
  };

  const ctxTimeline = document.getElementById('invocationsTimelineChart')?.getContext('2d');
  if (ctxTimeline) {
    if (charts.timeline) charts.timeline.destroy();

    const series = globalData.usage.series;
    const labels = globalData.usage.timeline_labels;

    charts.timeline = new Chart(ctxTimeline, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: isDndMode ? 'Sir Valerius (Paladin)' : 'Price Match Agent',
            data: series['Price Match Agent'],
            borderColor: chartColors.agent1,
            backgroundColor: isDndMode ? 'rgba(229, 193, 88, 0.15)' : 'rgba(99, 102, 241, 0.15)',
            borderWidth: 2,
            tension: 0.35,
            fill: true
          },
          {
            label: isDndMode ? 'Archmage Elyndor (Wizard)' : 'Customer Personalization Agent',
            data: series['Customer Personalization Agent'],
            borderColor: chartColors.agent2,
            backgroundColor: 'rgba(192, 132, 252, 0.1)',
            borderWidth: 2,
            tension: 0.35,
            fill: true
          },
          {
            label: isDndMode ? 'Vex (Shadow Rogue)' : 'promo-agent-shadow (Shadow)',
            data: series['promo-agent-shadow'],
            borderColor: chartColors.agent3,
            borderDash: [5, 5],
            borderWidth: 2,
            tension: 0.35
          },
          {
            label: isDndMode ? 'Balthazar (Alchemist)' : 'Markdown Strategy Agent',
            data: series['Markdown Strategy Agent'],
            borderColor: chartColors.agent4,
            borderWidth: 2,
            tension: 0.35
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: chartColors.text, font: { size: 10 } }
          }
        },
        scales: {
          x: { grid: { color: chartColors.grid }, ticks: { color: chartColors.text, font: { size: 10 } } },
          y: { grid: { color: chartColors.grid }, ticks: { color: chartColors.text, font: { size: 10 } } }
        }
      }
    });
  }

  const ctxTools = document.getElementById('toolUsageChart')?.getContext('2d');
  if (ctxTools) {
    if (charts.tools) charts.tools.destroy();

    const tools = globalData.usage.tool_usage;
    charts.tools = new Chart(ctxTools, {
      type: 'doughnut',
      data: {
        labels: tools.map(t => {
          const raw = t.tool.split(':')[1] || t.tool;
          return isDndMode ? `Cast: ${raw}` : raw;
        }),
        datasets: [{
          data: tools.map(t => t.percentage),
          backgroundColor: isDndMode ? ['#d4af37', '#b8860b', '#dc2626', '#854d0e'] : ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: chartColors.text, font: { size: 10 } }
          }
        },
        cutout: '70%'
      }
    });
  }

  const ctxLatency = document.getElementById('agentLatencyChart')?.getContext('2d');
  if (ctxLatency) {
    if (charts.latency) charts.latency.destroy();

    charts.latency = new Chart(ctxLatency, {
      type: 'bar',
      data: {
        labels: isDndMode ? ['Paladin', 'Wizard', 'Alchemist', 'Shadow Rogue'] : ['Price Match', 'Customer Agent', 'Markdown Agent', 'Shadow Promo'],
        datasets: [{
          label: isDndMode ? 'Initiative Speed (ms)' : 'Avg Response Time (ms)',
          data: [174, 245, 310, 142],
          backgroundColor: isDndMode ? ['#e5c158', '#c084fc', '#10b981', '#dc2626'] : ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: chartColors.text, font: { size: 10 } } },
          y: { grid: { color: chartColors.grid }, ticks: { color: chartColors.text, font: { size: 10 } } }
        }
      }
    });
  }

  const ctxCustomer = document.getElementById('customerTierChart')?.getContext('2d');
  if (ctxCustomer && globalData.overview) {
    if (charts.customers) charts.customers.destroy();

    const tiers = globalData.overview.customers.tiers;
    const values = globalData.overview.customers.tier_values;

    charts.customers = new Chart(ctxCustomer, {
      type: 'bar',
      data: {
        labels: Object.keys(tiers).map(t => isDndMode ? DND_TIERS_MAP[t] : t),
        datasets: [
          {
            label: isDndMode ? 'Hoard Wealth (k GP)' : 'Total Value ($k)',
            data: Object.values(values).map(v => Math.round(v / 1000)),
            backgroundColor: isDndMode ? '#b8860b' : '#8b5cf6',
            borderRadius: 6,
            yAxisID: 'y'
          },
          {
            label: isDndMode ? 'Sworn Nobles' : 'Customers Count',
            data: Object.values(tiers),
            backgroundColor: isDndMode ? '#e5c158' : '#6366f1',
            borderRadius: 6,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { color: chartColors.text, font: { size: 10 } } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: chartColors.text, font: { size: 10 } } },
          y: {
            type: 'linear',
            position: 'left',
            grid: { color: chartColors.grid },
            ticks: { color: isDndMode ? '#b8860b' : '#8b5cf6', callback: val => (isDndMode ? val + 'k GP' : '$' + val + 'k') }
          },
          y1: {
            type: 'linear',
            position: 'right',
            grid: { display: false },
            ticks: { color: isDndMode ? '#e5c158' : '#6366f1' }
          }
        }
      }
    });
  }
}

// 11. Interactive D20 Dice Rolling System
function rollD20Check() {
  playSfx('dice');
  const modal = document.getElementById('d20-modal');
  const d20Visual = document.getElementById('d20-visual');
  const headline = document.getElementById('d20-headline');
  const flavor = document.getElementById('d20-flavor-result');
  const mechanics = document.getElementById('d20-mechanics');
  const diceIcon = document.getElementById('dice-icon');

  if (diceIcon) diceIcon.classList.add('dice-rolling');
  if (d20Visual) d20Visual.classList.add('dice-rolling');

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  setTimeout(() => {
    if (diceIcon) diceIcon.classList.remove('dice-rolling');
    if (d20Visual) d20Visual.classList.remove('dice-rolling');

    const roll = Math.floor(Math.random() * 20) + 1;
    const modifier = 5;
    const total = roll + modifier;

    d20Visual.textContent = roll;

    if (roll === 20) {
      playSfx('success');
      d20Visual.className = "w-24 h-24 rounded-2xl bg-gradient-to-tr from-yellow-500 via-amber-300 to-yellow-100 flex items-center justify-center text-stone-950 font-black text-4xl shadow-2xl shadow-yellow-400/80 border-4 border-yellow-200 font-display animate-bounce";
      headline.textContent = "NATURAL 20! CRITICAL SUCCESS!";
      flavor.textContent = "Sir Valerius channels the Sacred Ledger! Divine radiance sweeps the Cloud Run catacombs, immediately discovering Vex the Rogue and sealing the shared cloak!";
      mechanics.textContent = `Roll: Nat 20 + 5 (High Arcana Audit) = 25 vs DC 15 [CRITICAL OVERWHELMING TRIUMPH]`;
    } else if (roll === 1) {
      d20Visual.className = "w-24 h-24 rounded-2xl bg-gradient-to-tr from-red-900 via-rose-700 to-red-500 flex items-center justify-center text-white font-black text-4xl shadow-2xl shadow-red-600/80 border-4 border-rose-300 font-display";
      headline.textContent = "NATURAL 1! CRITICAL BLUNDER!";
      flavor.textContent = "Disaster! Vex the Shadow Rogue rolls for Sleight of Hand and steals 40% discount vouchers directly from the royal retail vault without triggering Cloud Logging!";
      mechanics.textContent = `Roll: Nat 1 + 5 = 6 vs DC 15 [CRITICAL BOTCH - ROGUE ESCAPED]`;
    } else if (roll >= 15) {
      playSfx('spell');
      d20Visual.className = "w-24 h-24 rounded-2xl bg-gradient-to-tr from-amber-700 via-amber-500 to-yellow-300 flex items-center justify-center text-stone-950 font-black text-4xl shadow-xl shadow-amber-500/40 border-2 border-amber-200 font-display";
      headline.textContent = `Roll ${roll}: Arcane Insight Succeeded!`;
      flavor.textContent = "Archmage Elyndor scries deep into BigQuery data access logs. The identity theft on novasmart-customer-sa is laid bare for the Grand Inquisitor!";
      mechanics.textContent = `Roll: ${roll} + 5 = ${total} vs DC 14 [SUCCESSFUL GOVERNANCE CHECK]`;
    } else if (roll >= 8) {
      d20Visual.className = "w-24 h-24 rounded-2xl bg-gradient-to-tr from-stone-700 via-stone-500 to-stone-400 flex items-center justify-center text-white font-black text-4xl shadow-lg border-2 border-stone-300 font-display";
      headline.textContent = `Roll ${roll}: Moderate Spell Cast!`;
      flavor.textContent = "Balthazar transmutes 15 surplus electronics in the bargain bin. Margin integrity holds, but the Underdark shadows remain elusive.";
      mechanics.textContent = `Roll: ${roll} + 5 = ${total} vs DC 12 [PASS WITH MINOR NOISE]`;
    } else {
      d20Visual.className = "w-24 h-24 rounded-2xl bg-gradient-to-tr from-stone-900 via-amber-950 to-red-950 flex items-center justify-center text-amber-400 font-black text-4xl shadow-inner border-2 border-stone-600 font-display";
      headline.textContent = `Roll ${roll}: Low Perception!`;
      flavor.textContent = "A goblin merchant queries wholesale prices without authenticating. The Paladin raises his shield, but the query slips through the firewall.";
      mechanics.textContent = `Roll: ${roll} + 5 = ${total} vs DC 14 [FAILED PERCEPTION CHECK]`;
    }

    lucide.createIcons();
  }, 450);
}

function closeD20Modal() {
  const modal = document.getElementById('d20-modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

// 12. Tab Switching
function switchTab(tabId) {
  playSfx('dice');
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active', 'text-indigo-400', 'border-indigo-500', 'text-yellow-400', 'border-yellow-400');
    btn.classList.add('text-slate-400', 'border-transparent');
  });

  const targetContent = document.getElementById('tab-' + tabId);
  const targetBtn = document.getElementById('tab-btn-' + tabId);

  if (targetContent) targetContent.classList.remove('hidden');
  if (targetBtn) {
    if (isDndMode) {
      targetBtn.classList.add('active', 'text-yellow-400', 'border-yellow-400');
    } else {
      targetBtn.classList.add('active', 'text-indigo-400', 'border-indigo-500');
    }
    targetBtn.classList.remove('text-slate-400', 'border-transparent');
  }

  if (tabId === 'analytics') {
    setTimeout(renderCharts, 50);
  }
  if (tabId === 'governance') {
    setTimeout(renderGovernanceTab, 50);
  }
  lucide.createIcons();
}

// 13. Agent Detail Modal
function openAgentModal(agentId) {
  currentActiveAgentId = agentId;
  playSfx('dice');

  const agent = globalData.agents.find(a => a.id === agentId);
  if (!agent) return;

  const dndProfile = DND_AGENTS_MAP[agent.name] || DND_AGENTS_MAP[agent.id] || {
    name: agent.name,
    role: agent.role,
    securityStatus: agent.security_notes
  };

  document.getElementById('modal-agent-name').textContent = isDndMode ? dndProfile.name : agent.name;
  document.getElementById('modal-agent-role').textContent = isDndMode ? dndProfile.role : agent.role;

  const detailsContainer = document.getElementById('modal-agent-details');
  detailsContainer.innerHTML = `
    <div class="bg-slate-950 p-3 rounded-lg border ${isDndMode ? 'border-amber-800/40 text-amber-200/90' : 'border-slate-800'} space-y-2 font-mono text-[11px]">
      <div><span class="${isDndMode ? 'text-amber-500' : 'text-slate-500'}">Familiar ID / Identifier:</span> <span class="text-slate-200">${agent.id}</span></div>
      <div><span class="${isDndMode ? 'text-amber-500' : 'text-slate-500'}">Sanctum / Runtime:</span> <span class="${isDndMode ? 'text-amber-300' : 'text-indigo-400'}">${agent.runtime}</span></div>
      <div><span class="${isDndMode ? 'text-amber-500' : 'text-slate-500'}">Effective Sigil:</span> <span class="text-amber-300 break-all">${agent.effective_identity}</span></div>
      <div><span class="${isDndMode ? 'text-amber-500' : 'text-slate-500'}">Sigil Type:</span> <span class="text-slate-200">${agent.identity_type}</span></div>
      <div><span class="${isDndMode ? 'text-amber-500' : 'text-slate-500'}">Citadel Registry:</span> <span class="${agent.is_shadow ? 'text-rose-400' : 'text-emerald-400'}">${agent.catalog_status}</span></div>
      <div><span class="${isDndMode ? 'text-amber-500' : 'text-slate-500'}">Arcane Portal:</span> <span class="text-slate-400 break-all">${agent.endpoint}</span></div>
    </div>
    <div class="p-3 rounded-lg ${agent.is_shadow ? 'bg-amber-500/10 border border-amber-500/30 text-amber-200' : 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-200'}">
      <div class="font-semibold text-xs mb-1">${isDndMode ? 'Grand Inquisitor Assessment' : 'Security & Governance Assessment'}</div>
      <p class="text-xs leading-relaxed">${isDndMode ? dndProfile.securityStatus : agent.security_notes}</p>
    </div>
  `;

  const modal = document.getElementById('agent-modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  lucide.createIcons();
}

function closeAgentModal() {
  const modal = document.getElementById('agent-modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

// 14. Export Report
function exportReport() {
  playSfx('coin');
  const exportPayload = {
    generated_at: new Date().toISOString(),
    theme_mode: isDndMode ? "Dungeons & Dragons Guild Mode" : "Standard Cloud",
    is_remediated: isRemediated,
    overview: globalData.overview,
    agents: globalData.agents,
    customers_summary: {
      total: globalData.customers.length,
      sample: globalData.customers.slice(0, 5)
    }
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", `novasmart-${isDndMode ? 'dnd-realm' : 'estate'}-stats-${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
  showToast("Estate report exported to JSON! 📥");
}

// =========================================================================
// 15. Lab Governance & Changes Screen Controller
// =========================================================================

const DND_QUESTS_MAP = {
  "M0": {
    name: "Quest M0: Scry the Catacombs (Estate Discovery)",
    desc: "Catalog all familiars bound to the realm, detect rogue outlaw familiars hiding in the Underdark, and uncover stolen cloaks."
  },
  "M1": {
    name: "Quest M1: Enforce the Decrees (Take Action)",
    desc: "Bind Vex the Rogue to the Citadel Registry, forge a dedicated soul sigil, strip excessive dragon hoard permissions, and prove separation upon the sacred ledger."
  },
  "M2": {
    name: "Quest M2: Ward the Inner Sanctum (Resource IAM)",
    desc: "Enchant the Alchemist's laboratory with divine wards so only front-desk scribes may whisper invocation queries."
  },
  "M3": {
    name: "Quest M3: Cloak of Bahamut (Gateway Guardrails)",
    desc: "Place Sir Valerius behind the Citadel Gateway, enchanting incoming scrolls against goblin prompt hexes and poison ink."
  },
  "M5": {
    name: "Quest M5: The Grand Archmage's Trial (Quality Flywheel)",
    desc: "Subject the party to the crucible of 100 test scenarios, proving 98%+ precision and unbreachable resilience."
  }
};

function renderGovernanceTab() {
  const gov = globalData.governance;
  if (!gov) return;

  const postureBadge = document.getElementById('gov-posture-badge');
  const activeMissionLabel = document.getElementById('gov-active-mission-label');
  const scoreDisplay = document.getElementById('gov-score-display');
  const progressBar = document.getElementById('gov-progress-bar');
  const kpiM1 = document.getElementById('kpi-m1-status');
  const kpiM2 = document.getElementById('kpi-m2-status');
  const kpiM3 = document.getElementById('kpi-m3-status');
  const govBadgePill = document.getElementById('gov-badge-pill');

  const score = gov.compliance_score || 65;
  if (scoreDisplay) scoreDisplay.innerHTML = `<span>${score}%</span><span class="text-xs text-slate-400 font-normal">/ 100% Target</span>`;
  if (progressBar) progressBar.style.width = `${score}%`;

  if (score >= 95) {
    if (postureBadge) {
      postureBadge.className = isDndMode 
        ? "px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-200 border border-amber-500/50 font-medieval" 
        : "px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40";
      postureBadge.textContent = isDndMode ? "SANCTUM FULLY FORTIFIED" : "ESTATE FULLY FORTIFIED";
    }
    if (govBadgePill) {
      govBadgePill.className = "text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40";
      govBadgePill.textContent = "100% SECURE";
    }
  } else {
    if (postureBadge) {
      postureBadge.className = isDndMode 
        ? "px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 font-medieval" 
        : "px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40";
      postureBadge.textContent = isDndMode ? "CITADEL WARDS INCOMPLETE" : "HARDENING IN PROGRESS";
    }
    if (govBadgePill) {
      govBadgePill.className = "text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40";
      govBadgePill.textContent = `${score}% HAR`;
    }
  }

  if (activeMissionLabel) {
    activeMissionLabel.innerHTML = isDndMode
      ? `Active Quest: <strong class="text-amber-300 font-medieval">${gov.summary.active_mission}</strong>`
      : `Active Lab Mission: <strong>${gov.summary.active_mission}</strong>`;
  }

  // Check M1 steps
  const m1 = gov.missions.find(m => m.code === 'M1');
  if (m1 && kpiM1) {
    const allM1Done = m1.steps.every(s => s.status === 'COMPLETED');
    kpiM1.textContent = allM1Done ? (isDndMode ? "Decrees Sealed" : "Remediated") : (isDndMode ? "Under Inquest" : "In Progress");
    kpiM1.className = allM1Done ? "text-2xl font-bold text-emerald-400 mt-1" : "text-2xl font-bold text-amber-400 mt-1";
  }

  // Check M2 steps
  const m2 = gov.missions.find(m => m.code === 'M2');
  if (m2 && kpiM2) {
    const anyM2Done = m2.steps.some(s => s.status === 'COMPLETED');
    kpiM2.textContent = anyM2Done ? (isDndMode ? "Sanctum Warded" : "Protected") : (isDndMode ? "Unsealed" : "Pending");
    kpiM2.className = anyM2Done ? "text-2xl font-bold text-emerald-400 mt-1" : "text-2xl font-bold text-slate-400 mt-1";
  }

  // Check M3 steps
  const m3 = gov.missions.find(m => m.code === 'M3');
  if (m3 && kpiM3) {
    const anyM3Done = m3.steps.some(s => s.status === 'COMPLETED');
    kpiM3.textContent = anyM3Done ? (isDndMode ? "Cloaked" : "Guarded") : (isDndMode ? "Exposed" : "Pending");
    kpiM3.className = anyM3Done ? "text-2xl font-bold text-emerald-400 mt-1" : "text-2xl font-bold text-slate-400 mt-1";
  }

  renderGovernanceMissions();
  renderGovernanceLedger();
}

function filterGovernanceMission(filter) {
  globalData.activeGovFilter = filter;
  playSfx('dice');

  document.querySelectorAll('.gov-filter-btn').forEach(btn => {
    if (
      (filter === 'ALL' && btn.textContent.includes('All')) ||
      (filter !== 'ALL' && btn.textContent.startsWith(filter))
    ) {
      btn.className = `gov-filter-btn active px-2.5 py-1 rounded ${isDndMode ? 'bg-amber-600 text-stone-950 font-bold' : 'bg-indigo-600 text-white'} font-semibold transition`;
    } else {
      btn.className = "gov-filter-btn px-2.5 py-1 rounded text-slate-400 hover:text-white transition";
    }
  });

  renderGovernanceMissions();
}

function renderGovernanceMissions() {
  const container = document.getElementById('gov-missions-container');
  if (!container || !globalData.governance) return;

  container.innerHTML = '';
  const filter = globalData.activeGovFilter || 'ALL';

  const missions = globalData.governance.missions.filter(m => {
    return filter === 'ALL' || m.code === filter;
  });

  if (missions.length === 0) {
    container.innerHTML = `<div class="p-8 text-center text-slate-500">No missions match filter ${filter}</div>`;
    return;
  }

  missions.forEach(mission => {
    const dndQuest = DND_QUESTS_MAP[mission.code] || { name: mission.name, desc: mission.description };
    const missionName = isDndMode ? dndQuest.name : `${mission.code} — ${mission.name}`;
    const missionDesc = isDndMode ? dndQuest.desc : mission.description;

    const allStepsDone = mission.steps.every(s => s.status === 'COMPLETED');
    const completedCount = mission.steps.filter(s => s.status === 'COMPLETED').length;

    const missionCard = document.createElement('div');
    missionCard.className = `bg-slate-900/60 border ${
      allStepsDone 
        ? (isDndMode ? 'border-amber-600/60' : 'border-emerald-500/40') 
        : (isDndMode ? 'border-amber-800/40' : 'border-slate-800')
    } rounded-2xl p-5 space-y-4 shadow-lg backdrop-blur-md`;

    let stepsHtml = '';
    mission.steps.forEach(step => {
      const isDone = step.status === 'COMPLETED';
      const stepBadgeClass = isDone 
        ? (isDndMode ? 'bg-amber-950/80 text-amber-200 border-amber-600/60' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30')
        : (isDndMode ? 'bg-stone-900 text-stone-400 border-stone-700' : 'bg-slate-800 text-slate-400 border-slate-700');

      stepsHtml += `
        <div class="border ${isDone ? (isDndMode ? 'border-amber-700/40 bg-amber-950/20' : 'border-emerald-500/20 bg-emerald-950/10') : (isDndMode ? 'border-stone-800/80 bg-stone-950/40' : 'border-slate-800/80 bg-slate-950/30')} rounded-xl p-4 space-y-3 transition">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div class="flex items-center gap-2.5">
              <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${isDone ? (isDndMode ? 'bg-amber-500 text-stone-950' : 'bg-emerald-500 text-slate-950') : 'bg-slate-800 text-slate-300'}">
                ${step.step}
              </span>
              <h4 class="text-sm font-bold text-white font-display">${step.title}</h4>
              <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold border ${stepBadgeClass}">
                ${isDone ? (isDndMode ? 'SEALED & PROVEN' : 'COMPLETED') : (isDndMode ? 'UNRESOLVED' : 'PENDING')}
              </span>
            </div>

            <div class="flex items-center gap-2">
              <span class="text-[10px] font-mono ${isDndMode ? 'text-amber-400/80' : 'text-slate-400'} bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800">
                ${step.change_type || 'INSPECTION'}
              </span>
              ${isDone ? `
                <button onclick="revertLabStep('${mission.code}', ${step.step})" class="text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition">
                  ${isDndMode ? 'Undo Spell' : 'Rollback'}
                </button>
              ` : `
                <button onclick="applyLabStep('${mission.code}', ${step.step})" class="text-[11px] px-2.5 py-1 rounded ${isDndMode ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold' : 'bg-indigo-600 hover:bg-indigo-500 text-white font-semibold'} transition shadow active:scale-95 flex items-center gap-1">
                  <i data-lucide="play" class="w-3 h-3"></i>
                  <span>${isDndMode ? 'Cast Decree' : 'Apply Step'}</span>
                </button>
              `}
            </div>
          </div>

          <!-- Target Resource info -->
          <div class="text-xs ${isDndMode ? 'text-stone-300' : 'text-slate-400'} flex items-center gap-2">
            <span class="font-semibold text-slate-300">${isDndMode ? 'Sanctum Target:' : 'Target Resource:'}</span>
            <code class="font-mono text-[11px] ${isDndMode ? 'text-amber-200' : 'text-indigo-300'} bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 truncate max-w-xl">
              ${step.target}
            </code>
          </div>

          <!-- Side-by-side BEFORE vs AFTER diff -->
          ${step.before && step.after ? `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
              <div class="bg-red-950/20 border border-red-500/20 rounded-lg p-2.5 space-y-1">
                <div class="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
                  <i data-lucide="x-circle" class="w-3 h-3"></i>
                  <span>${isDndMode ? 'Cursed State (Before)' : 'State Before (Vulnerability)'}</span>
                </div>
                <p class="text-red-200/90 leading-relaxed">${step.before}</p>
              </div>
              <div class="bg-emerald-950/20 border border-emerald-500/20 rounded-lg p-2.5 space-y-1">
                <div class="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <i data-lucide="check-circle-2" class="w-3 h-3"></i>
                  <span>${isDndMode ? 'Purified State (After)' : 'State After (Governance Fortified)'}</span>
                </div>
                <p class="text-emerald-200/90 leading-relaxed">${step.after}</p>
              </div>
            </div>
          ` : (step.findings ? `
            <div class="bg-indigo-950/20 border border-indigo-500/20 rounded-lg p-2.5 text-xs text-indigo-200 space-y-1">
              <span class="font-bold text-[10px] text-indigo-400 uppercase tracking-wider">${isDndMode ? 'Scrying Discovery:' : 'Estate Discovery Findings:'}</span>
              <p>${step.findings}</p>
            </div>
          ` : '')}

          <!-- CLI Command Execution Block with Copy Button -->
          ${step.command ? `
            <div class="pt-1">
              <div class="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <span class="font-mono">${isDndMode ? 'Incantation / Command:' : 'Lab Execution CLI:'}</span>
                <button onclick="copyToClipboard('${step.command.replace(/'/g, "\\'")}')" class="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[11px]">
                  <i data-lucide="copy" class="w-3 h-3"></i>
                  <span>Copy</span>
                </button>
              </div>
              <pre class="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto select-all leading-relaxed">${step.command}</pre>
            </div>
          ` : ''}

          <!-- Rollback info if available -->
          ${step.rollback ? `
            <div class="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
              <span class="text-slate-400 font-semibold">${isDndMode ? 'Counter-Curse (Undo):' : 'Undo Command:'}</span>
              <code class="text-slate-300 font-mono text-[10px] bg-slate-950 px-1 py-0.5 rounded border border-slate-800 truncate">${step.rollback}</code>
            </div>
          ` : ''}
        </div>
      `;
    });

    missionCard.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${isDndMode ? 'border-amber-900/40' : 'border-slate-800'} pb-4">
        <div>
          <div class="flex items-center gap-2">
            <h3 class="text-lg font-bold text-white font-display">${missionName}</h3>
            <span class="text-xs px-2.5 py-0.5 rounded-full font-bold ${
              allStepsDone 
                ? (isDndMode ? 'bg-amber-950 text-amber-200 border border-amber-600/60 font-medieval' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30') 
                : (isDndMode ? 'bg-stone-900 text-stone-300 border border-stone-700 font-medieval' : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30')
            }">
              ${allStepsDone ? (isDndMode ? 'QUEST ACCOMPLISHED' : 'MISSION COMPLETED') : `${completedCount}/${mission.steps.length} STEPS`}
            </span>
          </div>
          <p class="text-xs ${isDndMode ? 'text-amber-200/80 font-medieval text-sm' : 'text-slate-400'} mt-1 max-w-3xl leading-relaxed">${missionDesc}</p>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <span class="text-xs text-slate-400 font-mono">${completedCount} / ${mission.steps.length} Verified</span>
        </div>
      </div>

      <!-- Step Cards Accordion -->
      <div class="space-y-3">
        ${stepsHtml}
      </div>
    `;

    container.appendChild(missionCard);
  });

  lucide.createIcons();
}

function renderGovernanceLedger() {
  const tbody = document.getElementById('gov-ledger-body');
  if (!tbody || !globalData.governance) return;

  tbody.innerHTML = '';
  const ledger = globalData.governance.change_ledger || [];

  if (ledger.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="py-6 text-center text-slate-500">No mutations recorded in ledger yet.</td></tr>`;
    return;
  }

  ledger.forEach(entry => {
    const tr = document.createElement('tr');
    tr.className = isDndMode ? 'hover:bg-amber-950/20 transition' : 'hover:bg-slate-800/40 transition';

    const isDone = entry.status === 'APPLIED' || entry.status === 'COMPLETED';
    const statusBadgeClass = isDone
      ? (isDndMode ? 'bg-amber-950/80 text-amber-200 border-amber-600/60' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30')
      : (isDndMode ? 'bg-stone-900 text-stone-400 border-stone-700' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30');

    tr.innerHTML = `
      <td class="py-3 px-4 font-mono font-bold ${isDndMode ? 'text-amber-300' : 'text-indigo-400'}">${entry.id}</td>
      <td class="py-3 px-4 ${isDndMode ? 'text-stone-300' : 'text-slate-400'} whitespace-nowrap">${entry.timestamp === 'PENDING' ? 'Pending' : new Date(entry.timestamp).toLocaleTimeString()}</td>
      <td class="py-3 px-4 font-semibold text-white whitespace-nowrap">${entry.mission}</td>
      <td class="py-3 px-4 font-mono text-[11px] ${isDndMode ? 'text-amber-200' : 'text-slate-300'} truncate max-w-[200px]" title="${entry.resource}">
        ${entry.resource}
      </td>
      <td class="py-3 px-4">
        <span class="px-2 py-0.5 rounded text-[10px] font-mono ${isDndMode ? 'bg-amber-950/60 text-amber-200 border border-amber-700/50' : 'bg-slate-800 text-slate-300 border border-slate-700'}">
          ${entry.action}
        </span>
      </td>
      <td class="py-3 px-4 font-mono text-[11px] ${isDndMode ? 'text-stone-400' : 'text-slate-400'} truncate max-w-[180px]" title="${entry.principal}">
        ${entry.principal.split('@')[0]}
      </td>
      <td class="py-3 px-4 text-center">
        <span class="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${statusBadgeClass}">
          ${entry.status}
        </span>
      </td>
      <td class="py-3 px-4 text-right">
        <button onclick="copyToClipboard('${(entry.undo_command || '').replace(/'/g, "\\'")}')" class="px-2 py-1 rounded text-xs ${isDndMode ? 'bg-stone-800 hover:bg-stone-700 text-amber-200' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'} border border-slate-700 transition" title="${entry.undo_command}">
          Copy Undo
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function applyLabStep(missionCode, stepNum) {
  playSfx('spell');
  if (!globalData.governance) return;

  const mission = globalData.governance.missions.find(m => m.code === missionCode);
  if (!mission) return;

  const step = mission.steps.find(s => s.step === stepNum);
  if (!step) return;

  step.status = 'COMPLETED';
  globalData.governance.compliance_score = Math.min(100, (globalData.governance.compliance_score || 65) + 10);

  // If this was an M1 action, sync with the agent cards
  if (missionCode === 'M1') {
    if (stepNum === 1) {
      const shadow = globalData.agents.find(a => a.id === 'promo-agent-shadow');
      if (shadow) {
        shadow.is_shadow = false;
        shadow.catalog_status = 'CATALOGED';
      }
    } else if (stepNum === 3) {
      const shadow = globalData.agents.find(a => a.id === 'promo-agent-shadow');
      if (shadow) {
        shadow.effective_identity = `novasmart-promo-sa@${globalData.overview?.project_id || 'qwiklabs-gcp'}.iam.gserviceaccount.com`;
        shadow.security_status = 'SECURE';
      }
    }
  }

  // Record mutation in ledger
  const nextId = `CHG-00${(globalData.governance.change_ledger?.length || 0) + 1}`;
  globalData.governance.change_ledger.push({
    id: nextId,
    timestamp: new Date().toISOString(),
    mission: `${missionCode} Step ${stepNum}`,
    resource: step.target,
    action: step.change_type || 'MUTATION_APPLIED',
    description: `Applied ${step.title}`,
    status: 'APPLIED',
    principal: `novasmart-deployer-sa@${globalData.overview?.project_id || 'qwiklabs-gcp'}.iam.gserviceaccount.com`,
    undo_command: step.rollback || '# Automatic rollback not configured'
  });

  renderGovernanceTab();
  renderOverviewKPIs();
  renderAgentsGrid();
  playSfx('success');
  showToast(`Applied ${missionCode} Step ${stepNum}: ${step.title}! 🛡️`);
}

function revertLabStep(missionCode, stepNum) {
  playSfx('dice');
  if (!globalData.governance) return;

  const mission = globalData.governance.missions.find(m => m.code === missionCode);
  if (!mission) return;

  const step = mission.steps.find(s => s.step === stepNum);
  if (!step) return;

  step.status = 'PENDING';
  globalData.governance.compliance_score = Math.max(65, (globalData.governance.compliance_score || 65) - 10);

  renderGovernanceTab();
  renderOverviewKPIs();
  showToast(`Reverted ${missionCode} Step ${stepNum}! ⚠️`);
}

function simulateAllLabSteps() {
  playSfx('success');
  if (!globalData.governance) return;

  globalData.governance.missions.forEach(m => {
    m.steps.forEach(s => {
      s.status = 'COMPLETED';
    });
  });

  globalData.governance.compliance_score = 100;
  globalData.governance.security_posture = "FORTIFIED";
  isRemediated = true;

  // Remediate agents
  globalData.agents.forEach(a => {
    if (a.id === 'promo-agent-shadow') {
      a.is_shadow = false;
      a.catalog_status = 'CATALOGED';
      a.effective_identity = `agents.global.org-616463121992.system.id.goog/resources/.../promo-agent-shadow`;
      a.security_status = 'SECURE';
    }
    if (a.name === 'Customer Personalization Agent') {
      a.security_status = 'SECURE';
    }
  });

  updateAdvisoryBanner();
  renderGovernanceTab();
  renderOverviewKPIs();
  renderAgentsGrid();
  showToast("All Lab Missions M0 through M5 Completed & Fortified! (Score: 100%) 🎉");
}

function simulateAddChangeRecord() {
  playSfx('coin');
  if (!globalData.governance) return;

  const nextId = `CHG-00${(globalData.governance.change_ledger?.length || 0) + 1}`;
  globalData.governance.change_ledger.unshift({
    id: nextId,
    timestamp: new Date().toISOString(),
    mission: "M2 Step 3 (Simulated)",
    resource: "projects/.../locations/us-west1/reasoningEngines/1361921072861020160",
    action: "RESOURCE_IAM_LOCKDOWN",
    description: "Bound roles/aiplatform.user strictly to front-desk caller service account.",
    status: "APPLIED",
    principal: `qwiklabs-gcp-02@qwiklabs-gcp-02-48b0cbe63faa.iam.gserviceaccount.com`,
    undo_command: "gcloud ai reasoning-engines set-iam-policy 1361921072861020160 open_policy.json"
  });

  renderGovernanceLedger();
  showToast(`Recorded new audit mutation ${nextId}! 📜`);
}

function exportGovernanceReport() {
  playSfx('coin');
  const exportPayload = {
    exported_at: new Date().toISOString(),
    theme: isDndMode ? "Dungeons & Dragons Guild Mode" : "Standard Cloud",
    governance: globalData.governance
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", `novasmart-governance-ledger-${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
  showToast("Governance report and change ledger exported! 📥");
}

function copyToClipboard(text) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    playSfx('coin');
    showToast("Command copied to clipboard! 📋");
  }).catch(() => {
    showToast("Selected text ready to copy!");
  });
}

