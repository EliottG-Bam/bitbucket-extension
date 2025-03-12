const NAV_CONTAINER_ID = "navContainer";
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
  const navContainer = document.createElement("div");
  navContainer.id = NAV_CONTAINER_ID;

  const prevLink = document.createElement("a");
  prevLink.href = "#"; // set desired href
  prevLink.textContent = "Previous";

  const nextLink = document.createElement("a");
  nextLink.href = "#"; // set desired href
  nextLink.textContent = "Next";

  navContainer.appendChild(prevLink);
  navContainer.appendChild(document.createTextNode(" | "));
  navContainer.appendChild(nextLink);

  const mainDiv = document.querySelector("main#main");
  mainDiv.prepend(navContainer);

  // Get the PR ID and set the href for the "Previous" button
  const prId = await getCurrentPRId();
  if (prId) {
    prevLink.href = `https://bitbucket.org/galerieslafayette/detaxe-mobile/pull-requests/${prId}`;
  }
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
