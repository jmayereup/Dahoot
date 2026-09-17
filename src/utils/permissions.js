/**
 * Permissions helper utilities for Dahoot
 */

export const canEditGame = (game, currentUser, userInfo, userRole) => {
  if (!game || !currentUser) return false;
  const role = userRole || userInfo?.role;
  if (role === 'TEACHER' || role === 'ADMIN') return true;
  
  const creatorName = game.creator ? game.creator.toLowerCase().trim() : '';
  const myDahootUsername = userInfo?.dahoot_username ? userInfo.dahoot_username.toLowerCase().trim() : '';
  const myName = currentUser?.name ? currentUser.name.toLowerCase().trim() : '';
  const myEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : '';
  const myUsername = currentUser?.username ? currentUser.username.toLowerCase().trim() : '';

  return Boolean(
    (myDahootUsername && creatorName === myDahootUsername) ||
    (myName && creatorName === myName) ||
    (myEmail && creatorName === myEmail) ||
    (myUsername && creatorName === myUsername) ||
    (currentUser?.id && creatorName === currentUser.id)
  );
};

export const canDeleteGame = (game, currentUser, userInfo, userRole) => {
  if (!game || !currentUser) return false;
  const role = userRole || userInfo?.role;
  if (role === 'ADMIN') return true;

  const creatorName = game.creator ? game.creator.toLowerCase().trim() : '';
  const myDahootUsername = userInfo?.dahoot_username ? userInfo.dahoot_username.toLowerCase().trim() : '';
  const myName = currentUser?.name ? currentUser.name.toLowerCase().trim() : '';
  const myEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : '';
  const myUsername = currentUser?.username ? currentUser.username.toLowerCase().trim() : '';

  return Boolean(
    (myDahootUsername && creatorName === myDahootUsername) ||
    (myName && creatorName === myName) ||
    (myEmail && creatorName === myEmail) ||
    (myUsername && creatorName === myUsername) ||
    (currentUser?.id && creatorName === currentUser.id)
  );
};
