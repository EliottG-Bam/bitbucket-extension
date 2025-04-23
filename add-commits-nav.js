function getProjectURL() {
  const match = window.location.pathname.match(/^\/([^/]+\/[^/]+)/);
  return match ? match[1] : null;
}

const projectURL = getProjectURL();

// ------------------------------
// Helper functions
// ------------------------------
function getCommitNumber() {
  // Support both "/commits/<commit>" and "/commit/<commit>"
  // Also handle cases where there might be query parameters or other content after the commit hash
  let match = window.location.pathname.match(/\/commits\/([^/?#]+)/);
  if (!match) {
    match = window.location.pathname.match(/\/commit\/([^/?#]+)/);
  }
  return match ? match[1] : null;
}

async function getCurrentPRId() {
  const commitNumber = getCommitNumber();
  if (!commitNumber) {
    console.error("No commit number found in URL.");
    return;
  }

  try {
    // 1. Get annotated references for the commit
    const annotatedRefsUrl = `https://bitbucket.org/!api/internal/repositories/${projectURL}/changeset/${commitNumber}/annotated_refs`;
    const annotatedRefsResponse = await fetch(annotatedRefsUrl);
    const annotatedRefs = await annotatedRefsResponse.json();

    // 2. Extract the first branch name from the annotated refs data.
    // The expected structure is an array where the branch names are in the second element of the inner array.
    const branches = annotatedRefs[0] && annotatedRefs[0][1];
    if (!branches || branches.length === 0) {
      console.error("No branches found in annotated refs.");
      return;
    }
    const branchName = branches[0];

    // 3. Build the query URL for fetching the pull request.
    const query = `source.branch.name="${branchName}" AND source.repository.full_name="galerieslafayette/detaxe-mobile" AND destination.repository.full_name="galerieslafayette/detaxe-mobile" AND destination.branch.name="master"`;
    const encodedQuery = encodeURIComponent(query);
    const prUrl = `https://bitbucket.org/!api/2.0/repositories/${projectURL}/pullrequests/?fields=next,values.links,values.title,values.id,values.state,values.created_on,values.closed_on&q=${encodedQuery}`;

    // 4. Fetch the pull request data and extract the PR id.
    const prResponse = await fetch(prUrl);
    const prData = await prResponse.json();
    if (!prData.values || prData.values.length === 0) {
      console.error("No pull request found for branch:", branchName);
      return;
    }
    const prId = prData.values[0].id;

    // Log the pull request id.
    console.log("Pull Request ID:", prId);
    return prId;
  } catch (error) {
    console.error("Error in getCurrentPRId:", error);
  }
}

let cachedPRId = null;
async function getCachedPRId() {
  if (cachedPRId) {
    console.log("Using cached PR ID:", cachedPRId);
    return cachedPRId;
  }
  cachedPRId = await getCurrentPRId();
  console.log("Fetched PR ID:", cachedPRId);
  return cachedPRId;
}

async function getCommitInfos(prId) {
  if (!prId) return null;
  // https://bitbucket.org/!api/2.0/repositories/galerieslafayette/detaxe-mobile/pullrequests/270/commits
  // fetch commits the commits
  const commitsUrl = `https://bitbucket.org/!api/2.0/repositories/${projectURL}/pullrequests/${prId}/commits?pagelen=100`;
  const commitsResponse = await fetch(commitsUrl);
  const commitsData = await commitsResponse.json();
  const commitsHistory = commitsData.values;

  const commitsLength = commitsHistory.length;

  const currentCommitNumber = getCommitNumber();

  let previousCommit = null;
  let nextCommit = null;
  let currentCommitIndex = 0;
  for (let i = 0; i < commitsHistory.length; i++) {
    if (commitsHistory[i].hash === currentCommitNumber) {
      currentCommitIndex = i;
      if (i > 0) {
        // "Next" commit is the newer commit at index i - 1
        nextCommit = commitsHistory[i - 1].hash;
      }
      if (i < commitsHistory.length - 1) {
        // "Previous" commit is the older commit at index i + 1
        previousCommit = commitsHistory[i + 1].hash;
      }
      break;
    }
  }

  return {
    previousCommit,
    nextCommit,
    currentCommitIndex,
    commitsLength,
  };
}

// ------------------------------
//
// Commit by commit navigation
//
// ------------------------------
const NAV_CONTAINER_ID = "bitbucket-booster-nav-container";

navigation.addEventListener("navigate", () => {
  // setTimeout to wait for the page to be updated before checking the URL
  setTimeout(async () => {
    cachedPRId = null;
    await updateNavBar();
  });
});
updateNavBar();

async function updateNavBar() {
  const navContainer = document.getElementById(NAV_CONTAINER_ID);

  if (getCommitNumber() && !navContainer) {
    await createNavBar();
  } else if (!getCommitNumber() && navContainer) {
    navContainer.remove();
  }
}

async function createNavBar() {
  const prId = await getCachedPRId();
  const commitInfo = await getCommitInfos(prId);

  const navContainer = document.createElement("div");
  navContainer.id = NAV_CONTAINER_ID;

  // add a home button
  const homeLink = document.createElement("a");
  homeLink.textContent = "Home";
  homeLink.className = "home-link";
  const pullRequestHomeUrl = window.location.href.replace(
    /\/commits\/[a-fA-F0-9]+/,
    `/pull-requests/${prId}`
  );
  homeLink.setAttribute("href", pullRequestHomeUrl);

  navContainer.appendChild(homeLink);

  // add pagination index
  const commitIndex = commitInfo.currentCommitIndex;
  const commitsLength = commitInfo.commitsLength;
  const commitIndexText = document.createElement("span");
  commitIndexText.id = "commitIndex";
  commitIndexText.textContent = `${
    commitsLength - commitIndex
  } / ${commitsLength}`;

  navContainer.appendChild(commitIndexText);

  if (!commitInfo) return;
  const prevLink = document.createElement("a");
  prevLink.textContent = "< Prev";
  prevLink.className = "bitbucket-booster-nav-link";
  if (commitInfo.previousCommit) {
    // replace the commit hash in the URL to get the href
    const prevCommitUrl = window.location.href.replace(
      /\/commits\/[a-fA-F0-9]+/,
      `/commits/${commitInfo.previousCommit}`
    );
    prevLink.href = prevCommitUrl;
  } else {
    prevLink.classList.add("disabled");
  }

  const nextLink = document.createElement("a");
  nextLink.textContent = "Next >";
  nextLink.className = "bitbucket-booster-nav-link";
  if (commitInfo.nextCommit) {
    // replace the commit hash in the URL to get the href
    const nextCommitUrl = window.location.href.replace(
      /\/commits\/[a-fA-F0-9]+/,
      `/commits/${commitInfo.nextCommit}`
    );
    nextLink.href = nextCommitUrl;
  } else {
    nextLink.classList.add("disabled");
  }

  navContainer.appendChild(prevLink);
  navContainer.appendChild(nextLink);

  const mainDiv = document.querySelector("main#main");
  mainDiv.prepend(navContainer);
}

// Keyboard navigation: Press "n" for next commit and "p" for previous commit.
document.addEventListener("keydown", (event) => {
  // Avoid interfering when typing in input fields, textareas, selects, or contentEditable elements
  const target = event.target;
  if (target.matches("input, textarea, select") || target.isContentEditable)
    return;

  const navLinks = document.querySelectorAll(".bitbucket-booster-nav-link");

  if (event.key.toLowerCase() === "n") {
    const nextLink = navLinks[1];
    if (nextLink && !nextLink.classList.contains("disabled")) {
      window.location.href = nextLink.href;
    }
  } else if (event.key.toLowerCase() === "p") {
    const prevLink = navLinks[0];
    if (prevLink && !prevLink.classList.contains("disabled")) {
      window.location.href = prevLink.href;
    }
  }
});

// ------------------------------
//
// Post commit message to PR
//
// ------------------------------
// Save the original fetch so we can use it later.
const originalFetch = window.fetch;

window.fetch = async function (input, init = {}) {
  // normalize
  const method = (init.method || input.method || "GET").toUpperCase();
  const url = typeof input === "string" ? input : input.url;

  // match commit comments (flexible for plural, slash, query)
  const commitCommentsRegex = new RegExp(
    `^https://bitbucket\\.org/!api/2\\.0/repositories/${projectURL}` +
      `/commit(?:s)?/([^/]+)/comments(?:/?(?:\\?.*)?)?$`
  );

  if (method === "POST" && commitCommentsRegex.test(url)) {
    console.log("Matched commit comment POST:", url);
    const [, commitID] = url.match(commitCommentsRegex);

    const prId = await getCachedPRId();
    if (!prId) {
      console.error("No PR ID cached; falling back.");
      return originalFetch(input, init);
    }

    const newUrl =
      `https://bitbucket.org/!api/2.0/repositories/${projectURL}` +
      `/pullrequests/${prId}/comments`;
    console.log(`Redirecting comment on ${commitID} → PR ${prId}`, newUrl);

    // rebuild init so we carry over body & headers
    let body = init.body;
    let headers = init.headers;
    if (typeof input !== "string") {
      headers = headers || input.headers;
      body = body || (await input.clone().text());
    }

    const newInit = { ...init, method, headers, body };
    return originalFetch(newUrl, newInit)
      .then((response) => {
        console.log(`Successfully posted to PR ${prId}.`);
        return response;
      })
      .catch((err) => {
        console.error("Error posting to PR comments:", err);
        throw err;
      });
  }

  // For all other requests, use the original fetch.
  return originalFetch(input, init);
};
