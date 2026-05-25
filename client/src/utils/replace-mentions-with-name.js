const findUserByUsernameOrEmail = (usernameOrEmail, users) => {
  if (!users || users.length === 0) {
    return null;
  }

  return users.find(
    (member) => member.user.username === usernameOrEmail || member.user.email === usernameOrEmail,
  );
};

const replaceMentionsWithName = (text, users) => {
  if (!text) {
    return text;
  }

  const mentionRegex = /\[@(.*?)\]/g;
  return text.replace(mentionRegex, function replaceMention(matched) {
    mentionRegex.lastIndex = 0;

    const mentionMatch = matched.match(mentionRegex)[0];
    const nameOrEmail = mentionRegex.exec(mentionMatch)[1];
    const member = findUserByUsernameOrEmail(nameOrEmail, users);

    return member ? `[${member.user.name}](#)` : matched;
  });
};

export default replaceMentionsWithName;
