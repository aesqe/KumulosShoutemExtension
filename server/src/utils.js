export function navigateToUrl(url) {
  return {
    type: "@@navigator/NAVIGATE_REQUEST",
    payload: {
      component: "external",
      options: { url }
    }
  };
}
