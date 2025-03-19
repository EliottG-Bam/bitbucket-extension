const NAV_CONTAINER_ID = "bitbucket-booster-nav-container";
const BITBUCKET_COMMIT_URL_REGEX =
  /^https:\/\/bitbucket\.org\/[^\/]+\/[^\/]+\/commits\/([a-fA-F0-9]+)$/;

navigation.addEventListener("navigate", () => {
  // setTimeout to wait for the page to be updated before checking the URL
  setTimeout(async () => {
    await updateNavBar();
  });
});
updateNavBar();

async function updateNavBar() {
  const currentUrl = window.location.href;
  const navContainer = document.getElementById(NAV_CONTAINER_ID);

  if (BITBUCKET_COMMIT_URL_REGEX.test(currentUrl) && !navContainer) {
    await createNavBar();
  } else if (!BITBUCKET_COMMIT_URL_REGEX.test(currentUrl) && navContainer) {
    navContainer.remove();
  }
}

async function createNavBar() {
  const prId = await getCurrentPRId();
  const adjacentCommits = await getAdjacentCommits(prId);

  const navContainer = document.createElement("div");
  navContainer.id = NAV_CONTAINER_ID;

  // add a home button
  const homeLink = document.createElement("a");
  homeLink.textContent = "Home";
  const pullRequestHomeUrl = window.location.href.replace(
    /\/commits\/[a-fA-F0-9]+/,
    `/pull-requests/${prId}`
  );
  homeLink.setAttribute("href", pullRequestHomeUrl);

  navContainer.appendChild(homeLink);

  if (!adjacentCommits) return;
  const prevLink = document.createElement("a");
  prevLink.textContent = "Previous";
  prevLink.className = "bitbucket-booster-nav-link";
  if (adjacentCommits.previousCommit) {
    // replace the commit hash in the URL to get the href
    const prevCommitUrl = window.location.href.replace(
      /\/commits\/[a-fA-F0-9]+/,
      `/commits/${adjacentCommits.previousCommit}`
    );
    prevLink.href = prevCommitUrl;
  } else {
    prevLink.classList.add("disabled");
  }

  const nextLink = document.createElement("a");
  nextLink.textContent = "Next";
  nextLink.className = "bitbucket-booster-nav-link";
  if (adjacentCommits.nextCommit) {
    // replace the commit hash in the URL to get the href
    const nextCommitUrl = window.location.href.replace(
      /\/commits\/[a-fA-F0-9]+/,
      `/commits/${adjacentCommits.nextCommit}`
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

  if (event.key.toLowerCase() === "n") {
    const nextLink = document.querySelector(
      "#bitbucket-booster-nav-container .bitbucket-booster-nav-link:nth-child(2)"
    );
    if (nextLink && !nextLink.classList.contains("disabled")) {
      window.location.href = nextLink.href;
    }
  } else if (event.key.toLowerCase() === "p") {
    const prevLink = document.querySelector(
      "#bitbucket-booster-nav-container .bitbucket-booster-nav-link:nth-child(1)"
    );
    if (prevLink && !prevLink.classList.contains("disabled")) {
      window.location.href = prevLink.href;
    }
  }
});

// Step 1
function getCommitNumber() {
  // Support both "/commits/<commit>" and "/commit/<commit>"
  let match = window.location.pathname.match(/\/commits\/([^/]+)/);
  if (!match) {
    match = window.location.pathname.match(/\/commit\/([^/]+)/);
  }
  return match ? match[1] : null;
}

// Step 2
async function getCurrentPRId() {
  const commitNumber = getCommitNumber();
  if (!commitNumber) {
    console.error("No commit number found in URL.");
    return;
  }

  try {
    // 1. Get annotated references for the commit
    const annotatedRefsUrl = `https://bitbucket.org/!api/internal/repositories/galerieslafayette/detaxe-mobile/changeset/${commitNumber}/annotated_refs`;
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
    const prUrl = `https://bitbucket.org/!api/2.0/repositories/galerieslafayette/detaxe-mobile/pullrequests/?fields=next,values.links,values.title,values.id,values.state,values.created_on,values.closed_on&q=${encodedQuery}`;

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

// Step 3
async function getAdjacentCommits(prId) {
  if (!prId) return null;
  // https://bitbucket.org/!api/2.0/repositories/galerieslafayette/detaxe-mobile/pullrequests/270/commits
  // fetch commits the commits
  const commitsUrl = `https://bitbucket.org/!api/2.0/repositories/galerieslafayette/detaxe-mobile/pullrequests/${prId}/commits?pagelen=100`;
  const commitsResponse = await fetch(commitsUrl);
  const commitsData = await commitsResponse.json();
  const commitsHistory = commitsData.values;

  const currentCommitNumber = getCommitNumber();

  let previousCommit = null;
  let nextCommit = null;
  for (let i = 0; i < commitsHistory.length; i++) {
    if (commitsHistory[i].hash === currentCommitNumber) {
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
  };
}
