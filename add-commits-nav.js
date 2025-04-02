<<<<<<< HEAD
=======
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

async function getAdjacentCommits(prId) {
  if (!prId) return null;
  // https://bitbucket.org/!api/2.0/repositories/galerieslafayette/detaxe-mobile/pullrequests/270/commits
  // fetch commits the commits
  const commitsUrl = `https://bitbucket.org/!api/2.0/repositories/${projectURL}/pullrequests/${prId}/commits?pagelen=100`;
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

// ------------------------------
//
// Commit by commit navigation
//
// ------------------------------
>>>>>>> d43050e (:sparkles: feat(merging): merge all)
const NAV_CONTAINER_ID = "bitbucket-booster-nav-container";

navigation.addEventListener("navigate", () => {
  // setTimeout to wait for the page to be updated before checking the URL
  setTimeout(async () => {
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
<<<<<<< HEAD
  const adjacentCommits = await getAdjacentCommits();
  if (!adjacentCommits) return;
=======
  const prId = await getCachedPRId();
  const adjacentCommits = await getAdjacentCommits(prId);
>>>>>>> d43050e (:sparkles: feat(merging): merge all)

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

<<<<<<< HEAD
// Step 1
function getCommitNumber() {
  // Support both "/commits/<commit>" and "/commit/<commit>"
  let match = window.location.pathname.match(/\/commits\/([^/]+)/);
  if (!match) {
    match = window.location.pathname.match(/\/commit\/([^/]+)/);
  }
  return match ? match[1] : null;
}
=======
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

// ------------------------------
//
// Post commit message to PR
//
// ------------------------------
// Save the original fetch so we can use it later.
const originalFetch = window.fetch;
>>>>>>> d43050e (:sparkles: feat(merging): merge all)

window.fetch = async function (input, init = {}) {
  // Determine request details, whether input is a string or a Request object.
  let url, method, body, headers;
  if (typeof input === "string") {
    url = input;
    method = init.method || "GET";
    body = init.body;
    headers = init.headers;
  } else {
    // If input is a Request object, clone it so we can safely extract its body.
    url = input.url;
    method = input.method;
    headers = input.headers;
    // IMPORTANT: Reading the body from a Request consumes its stream.
    // We use clone() to avoid that, and then read the body as text.
    const clonedRequest = input.clone();
    body = await clonedRequest.text();
  }

<<<<<<< HEAD
  try {
    // 1. Get annotated references for the commit
    const annotatedRefsUrl = `https://bitbucket.org/!api/internal/repositories/galerieslafayette/detaxe-mobile/changeset/${commitNumber}/annotated_refs`;
    const annotatedRefsResponse = await fetch(annotatedRefsUrl);
    const annotatedRefs = await annotatedRefsResponse.json();
=======
  // Regex to match the commit comments endpoint
  const commitCommentsRegex =
    /^https:\/\/bitbucket\.org\/!api\/2\.0\/repositories\/${projectURL}\/commit\/([^/]+)\/comments\/$/;
>>>>>>> d43050e (:sparkles: feat(merging): merge all)

  if (method.toUpperCase() === "POST" && commitCommentsRegex.test(url)) {
    console.log("MATCHED COMMIT COMMENT POST");
    const commitID = url.match(commitCommentsRegex)[1];

    // Retrieve the associated PR id.
    const prId = await getCachedPRId();
    if (!prId) {
      console.error(
        "PR ID not available; proceeding with the original request."
      );
      return originalFetch(input, init);
    }

<<<<<<< HEAD
    // 3. Build the query URL for fetching the pull request.
    const query = `source.branch.name="${branchName}" AND source.repository.full_name="galerieslafayette/detaxe-mobile" AND destination.repository.full_name="galerieslafayette/detaxe-mobile" AND destination.branch.name="master"`;
    const encodedQuery = encodeURIComponent(query);
    const prUrl = `https://bitbucket.org/!api/2.0/repositories/galerieslafayette/detaxe-mobile/pullrequests/?fields=next,values.links,values.title,values.id,values.state,values.created_on,values.closed_on&q=${encodedQuery}`;
=======
    // Build the new URL using the PR id.
    const newUrl = `https://bitbucket.org/!api/2.0/repositories/${projectURL}/pullrequests/${prId}/comments/`;
    console.log(
      `Intercepted POST to commit ${commitID} comments. Redirecting to PR ${prId} comments endpoint: ${newUrl}`
    );
>>>>>>> d43050e (:sparkles: feat(merging): merge all)

    // Forward the POST call with the same options, ensuring we include the body.
    // If input was a Request object, we create a new init object.
    const newInit = {
      method: method,
      headers: headers,
      body: body,
      // Include any other properties from init if needed.
      ...init,
    };

<<<<<<< HEAD
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
=======
    originalFetch(newUrl, newInit)
      .then((response) => {
        console.log(`Successfully posted to PR ${prId} comments endpoint.`);
        return response;
      })
      .catch((error) => {
        console.error("Error posting to PR comments endpoint:", error);
        throw error;
      });
>>>>>>> d43050e (:sparkles: feat(merging): merge all)
  }

  // For all other requests, use the original fetch.
  return originalFetch(input, init);
};
