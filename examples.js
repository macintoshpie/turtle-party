socket.emit('draw', {type: 'color', color: 'blue'})
socket.emit('draw', {type: 'goto', position: [0, 0]})
socket.emit('draw', {type: 'goto', position: [100, 0]})
socket.emit('draw', {type: 'goto', position: [100, 100]})
socket.emit('draw', {type: 'goto', position: [0, 100]})

socket.emit('draw', {type: 'color', color: 'green'})
socket.emit('draw', {type: 'penup'})
socket.emit('draw', {type: 'goto', position: [100, 0]})
socket.emit('draw', {type: 'pendown'})
socket.emit('draw', {type: 'goto', position: [200, 0]})
socket.emit('draw', {type: 'goto', position: [200, 100]})
socket.emit('draw', {type: 'goto', position: [100, 100]})
socket.emit('draw', {type: 'goto', position: [100, 0]})

socket.emit('draw', {type: 'clear'})
