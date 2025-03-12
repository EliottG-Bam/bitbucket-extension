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
  const adjacentCommits = await getAdjacentCommits();
  if (!adjacentCommits) return;

  const navContainer = document.createElement("div");
  navContainer.id = NAV_CONTAINER_ID;

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

async function getAdjacentCommits() {
  const prId = await getCurrentPRId();
  if (!prId) return null;
  // https://bitbucket.org/!api/2.0/repositories/galerieslafayette/detaxe-mobile/pullrequests/270/commits
  // fetch commits the commits
  const commitsUrl = `https://bitbucket.org/!api/2.0/repositories/galerieslafayette/detaxe-mobile/pullrequests/${prId}/commits`;
  const commitsResponse = await fetch(commitsUrl);
  const commitsData = await commitsResponse.json();
  const commitsHistory = commitsData.values;

  const currentCommitNumber = getCommitNumber();

  let previousCommit = null;
  let nextCommit = null;
  for (let i = 0; i < commitsHistory.length; i++) {
    if (commitsHistory[i].hash === currentCommitNumber) {
      if (i > 0) {
        previousCommit = commitsHistory[i - 1].hash;
      }
      if (i < commitsHistory.length - 1) {
        nextCommit = commitsHistory[i + 1].hash;
      }
      break;
    }
  }

  return {
    previousCommit,
    nextCommit,
  };
}
