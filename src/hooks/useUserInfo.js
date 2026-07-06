import { useState, useEffect } from 'react';
import { pb } from '../pb';

export function useUserInfo(currentUser) {
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    let active = true;
    if (currentUser && currentUser.dahoot_info) {
      pb.collection('dahoot_user_info').getOne(currentUser.dahoot_info)
        .then(record => {
          if (active && record) {
            setUserInfo(record);
          }
        })
        .catch(err => {
          console.error("Error fetching user info in hook:", err);
        });
    } else {
      setUserInfo(null);
    }
    return () => { active = false; };
  }, [currentUser]);

  return { userInfo, setUserInfo };
}
