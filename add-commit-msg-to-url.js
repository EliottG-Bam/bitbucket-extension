const projectURL = "/globalFolder/projectName";

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

// Step 3, intercept all incoming comments
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

// Save the original fetch so we can use it later.
const originalFetch = window.fetch;

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

  // Regex to match the commit comments endpoint
  const commitCommentsRegex =
    /^https:\/\/bitbucket\.org\/!api\/2\.0\/repositories\/${projectURL}\/commit\/([^/]+)\/comments\/$/;

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

    // Build the new URL using the PR id.
    const newUrl = `https://bitbucket.org/!api/2.0/repositories/${projectURL}/pullrequests/${prId}/comments/`;
    console.log(
      `Intercepted POST to commit ${commitID} comments. Redirecting to PR ${prId} comments endpoint: ${newUrl}`
    );

    // Forward the POST call with the same options, ensuring we include the body.
    // If input was a Request object, we create a new init object.
    const newInit = {
      method: method,
      headers: headers,
      body: body,
      // Include any other properties from init if needed.
      ...init,
    };

    originalFetch(newUrl, newInit)
      .then((response) => {
        console.log(`Successfully posted to PR ${prId} comments endpoint.`);
        return response;
      })
      .catch((error) => {
        console.error("Error posting to PR comments endpoint:", error);
        throw error;
      });
  }

  // For all other requests, use the original fetch.
  return originalFetch(input, init);
};
