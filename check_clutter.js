import Clutter from 'gi://Clutter';
console.log('Clutter loaded:', Clutter);
console.log('Clutter.DragAction:', Clutter.DragAction);
try {
    const action = new Clutter.DragAction();
    console.log('new Clutter.DragAction() success:', action);
} catch (e) {
    console.log('new Clutter.DragAction() error:', e.message);
}
