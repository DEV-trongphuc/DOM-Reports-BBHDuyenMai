/**
 * Shared date formatter for adset start/end_time strings.
 * Declared module-level so render_campaign.js doesn't re-create it inside the adset loop.
 */
function _formatAdsetDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
}

/**
 * Skeleton Loader Helper — toggle display (không remove/recreate để tránh layout thrash)
 */
function toggleSkeletons(scopeSelector, isLoading) {
  const scope = document.querySelector(scopeSelector);
  if (!scope) return;

  // Cache cards list on the element to avoid re-querying + re-filtering on every toggle.
  // Reset cache when starting a new load cycle (isLoading=true) so newly inserted
  // cards (e.g. re-opened detail panel) are always picked up fresh.
  if (isLoading) scope._cachedCards = null;

  if (!scope._cachedCards) {
    let raw = scope.querySelectorAll(".dom_inner");
    if (scopeSelector === ".dom_dashboard" || scopeSelector === ".dom_container") {
      raw = Array.from(raw).filter((c) => !c.closest("#google_ads_container"));
    }
    scope._cachedCards = Array.from(raw);
  }
  const cards = scope._cachedCards;

  if (isLoading) {
    scope.classList.add("is-loading");
    cards.forEach((card) => {
      card.classList.add("is-loading");

      let skeleton = card.querySelector(".skeleton-container");
      if (!skeleton) {
        skeleton = document.createElement("div");
        skeleton.className = "skeleton-container";
        const isChart = card.querySelector("canvas");
        const isList  = card.querySelector("ul.dom_toplist");

        if (isChart) {
          skeleton.innerHTML = `
            <div class="skeleton skeleton-title" style="margin-bottom:2rem"></div>
            <div class="skeleton skeleton-chart"></div>
          `;
        } else if (isList || card.id === "detail_total_report" || card.id === "interaction_stats_card") {
          skeleton.innerHTML = `
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text" style="width:70%"></div>
          `;
        } else {
          skeleton.innerHTML = `
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text" style="width:80%"></div>
          `;
        }
        card.prepend(skeleton);
      }

      skeleton.style.display = "";
      Array.from(card.children).forEach((child) => {
        if (!child.classList.contains("skeleton-container")) child.classList.add("hide-on-load");
      });
    });
  } else {
    scope.classList.remove("is-loading");
    cards.forEach((card) => {
      card.classList.remove("is-loading");
      const skeleton = card.querySelector(".skeleton-container");
      if (skeleton) skeleton.style.display = "none";
      card.querySelectorAll(".hide-on-load").forEach((el) => el.classList.remove("hide-on-load"));
    });
  }
}

function getAction(actions, type) {
  if (!actions || !Array.isArray(actions)) return 0;
  for (let i = 0; i < actions.length; i++) {
    if (actions[i].action_type === type) return +actions[i].value || 0;
  }
  return 0;
}

async function runBatchesWithLimit(tasks, limit = CONCURRENCY_LIMIT) {
  const results = [];
  let i = 0;

  async function worker() {
    while (i < tasks.length) {
      const idx = i++;
      try {
        results[idx] = await tasks[idx]();
      } catch (err) {
        console.warn(`Batch ${idx} failed:`, err.message);
        results[idx] = null;
      }
    }
  }

  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

function getResults(item, goal) {
  if (!item) return 0;
  const insights = item.insights?.data?.[0] || item.insights || item;
  if (!insights) return 0;

  let optGoal = goal || VIEW_GOAL || item.optimization_goal || insights.optimization_goal || "";

  // If goal is a group name (e.g. "Lead Form"), resolve to a technical goal key
  let goalKey = GOAL_GROUP_LOOKUP[optGoal];
  if (!goalKey && goalMapping[optGoal]) {
    goalKey = optGoal;
    optGoal = goalMapping[goalKey][0];
  }

  if (optGoal === "REACH" || goalKey === "Awareness") {
    return +(insights.reach || insights.impressions || 0);
  }
  if (optGoal === "IMPRESSIONS") return +insights.impressions || 0;

  const actions  = insights.actions || {};
  let resultType = resultMapping[optGoal];

  if (!resultType && goalKey) resultType = GOAL_KEY_RESULT_MAP[goalKey];
  if (!resultType) resultType = resultMapping.DEFAULT;

  if (Array.isArray(actions)) {
    if (insights[resultType]) {
      const sp = insights[resultType];
      if (Array.isArray(sp))               return sp.reduce((s, a) => s + (+a.value || 0), 0);
      if (typeof sp === "number" || typeof sp === "string") return +sp;
      if (sp.value)                        return +sp.value;
    }

    for (let i = 0; i < actions.length; i++) {
      if (actions[i].action_type === resultType) return +actions[i].value || 0;
    }

    if (goalKey) {
      for (const g of goalMapping[goalKey]) {
        const altType = resultMapping[g];
        if (!altType) continue;
        if (insights[altType]) {
          const asp = insights[altType];
          if (Array.isArray(asp)) return asp.reduce((s, a) => s + (+a.value || 0), 0);
        }
        for (let i = 0; i < actions.length; i++) {
          if (actions[i].action_type === altType) return +actions[i].value || 0;
        }
      }
    }
    return 0;
  } else {
    if (actions[resultType]) return +actions[resultType];
    if (goalKey) {
      for (const g of goalMapping[goalKey]) {
        const altType = resultMapping[g];
        if (altType && actions[altType]) return +actions[altType];
      }
    }
    return 0;
  }
}
