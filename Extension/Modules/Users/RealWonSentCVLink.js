_MODULES.push({
    description: `
      <ul>
        <li>Turns "Gifts Won" and "Gifts Sent" in a user's <a href="https://www.steamgifts.com/user/cg">profile</a> page into links that take you to their real won/sent CV pages on <a href="https://www.sgtools.info/">SGTools</a>.</li>
      </ul>
    `,
    features: {
      rwscvl_r: {
        name: `Link SGTools' reverse pages (from newest to oldest).`,
        sg: true
      }
    },
    id: `rwscvl`,
    load: rwscvl,
    name: `Real Won/Sent CV Link`,
    sg: true,
    type: `users`
  });

  function rwscvl() {
    esgst.profileFeatures.push(rwscvl_add);
  }

  function rwscvl_add(profile) {
    let sentUrl, wonUrl;
    wonUrl = `http://www.sgtools.info/won/${profile.username}`;
    sentUrl = `http://www.sgtools.info/sent/${profile.username}`;
    if (esgst.rwscvl_r) {
      wonUrl += `/newestfirst`;
      sentUrl += `/newestfirst`;
    }
    createElements(profile.wonRowLeft, `inner`, [{
      attributes: {
        class: `esgst-rwscvl-link`,
        href: wonUrl,
        target: `_blank`,
        title: getFeatureTooltip(`rwscvl`)
      },
      text: `Gifts Won`,
      type: `a`
    }]);
    createElements(profile.sentRowLeft, `inner`, [{
      attributes: {
        class: `esgst-rwscvl-link`,
        href: sentUrl,
        target: `_blank`,
        title: getFeatureTooltip(`rwscvl`)
      },
      text: `Gifts Sent`,
      type: `a`
    }]);
  }
  