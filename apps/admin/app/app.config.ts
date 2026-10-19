// Host-level app config: it outranks the layers' own (core declares `rail`
// defaults and loads before prayer.tools' layers).
export default defineAppConfig({
  // The rail lists the current site's sections; switching sites is the header
  // switcher's job, and org settings are not offered to site owners.
  rail: {
    launcher: false,
    orgSettings: false
  }
})
