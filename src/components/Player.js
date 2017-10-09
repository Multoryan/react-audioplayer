import React, { Component } from 'react';
import Icons from './Icons.json';         //Пути к иконкам
let jsmediatags = require("jsmediatags"); //Библиотека для считывания медиа тегов

class Player extends Component{

  constructor(){
    super();
    this.state = {
      numberLoad: 0, //Количество загружаемых файлов
      countTrack: 0, //Количество треков всего
      lastId: 0,     //Следующий идентификатор
      track: [],     //массив треков
      currentTrack: '', //Текущий играющий трек
      duration: '', //Продолжительность трека
      position: '', //Позиция трека
      absDuration: '',
      absPosition: '',
      playing: false, //играет ли трек
      isShuffle: false,
      isRepeat: false,
      isMute: true,
      volume: 0.7
    };
    this.canvas = false;
    this.audio = false;
    this.analyser = false;
  }

  //Загрузка файлов
  upload = (e) => {
    if(!this.audio){
      const audioDOM = document.getElementById('music');
      const canvasDOM = document.getElementById('canvas');
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      const source = context.createMediaElementSource(audioDOM);
      this.audio = audioDOM;
      source.connect(analyser);                             //Подключаем следующей веткой анализатор
      analyser.connect(context.destination);                //С анализатора на выход
      this.analyser = analyser;
      this.canvas = canvasDOM;
    }
    let files;
    try{
      files = e.target.files; //Получаем все файлы
    }
    catch(error){
      files = e;
    }
    const countFiles = this.state.numberLoad + files.length;
    this.setState({
      numberLoad: countFiles
    });
    for(let i=0; i < files.length; ++i){
      let reader = new FileReader();
      reader.readAsArrayBuffer(files[i]);
      //Используя стрелочные функции мы сохраняем контекст,
      //здесь они принципиально нужны
      reader.onloadend = (e) => {
          jsmediatags.read(files[i], {
            onSuccess: (tags) => {
              var url = URL.createObjectURL(files[i]);
              let audio = {
                key: this.state.lastId++,
                artist: tags.tags.artist || files[i].name,
                title: tags.tags.title,
                image: tags.tags.picture,
                source: url
              }
              let newTrack = this.state.track.slice();
              newTrack.push(audio);
              this.setState({
                numberLoad: --this.state.numberLoad,
                countTrack: ++this.state.countTrack,
                track: newTrack
              });
              if(this.state.track.length === 1)
                this.setState({
                  currentTrack: this.state.track[0]
                });
            },
            onError: (error) => {
              var url = URL.createObjectURL(files[i]);
              let audio = {
                key: this.state.lastId++,
                artist: files[i].name,
                title: '',
                image: '',
                source: url
              }
              let newTrack = this.state.track.slice();
              newTrack.push(audio);
              this.setState({
                numberLoad: --this.state.numberLoad,
                countTrack: ++this.state.countTrack,
                track: newTrack
              });
            }
        });
      }
    }
  }

  remove(key){
    let playlist = this.state.track.slice();
    const idx = this.findId(key);
    playlist.splice(idx,1);
    this.setState({
      track: playlist,
      countTrack: --this.state.countTrack
    });
  }

  play(track){
    this.setState({
      currentTrack: track,
      playing: true
    });
  }

  renderList(){
    return this.state.track.map((track) => {
      //Отображение картинки (взято с документации https://github.com/aadsm/JavaScript-ID3-Reader)
      let base64String = "";
      let dataUrl;
      if(track.image){
        for (let i = 0; i < track.image.data.length; i++) {
            base64String += String.fromCharCode(track.image.data[i]);
        }
        dataUrl = "data:" + track.image.format + ";base64," + window.btoa(base64String);
      }else {
        dataUrl = Icons.audio;
      }
      const title = track.title ? ' - ' + track.title : '';
      const active = this.state.currentTrack.key === track.key ? 'active' : '';
      return(
        <li key={track.key} className={active} onDoubleClick={() => this.play(track)}>
            <img src={dataUrl} alt="Album Picture" width="50px" />
            <span>{track.artist}</span>
            <span>{title}</span>
            <img src={Icons.delete} className="delete {active}" onClick={() => this.remove(track.key)} alt="Remove" />
        </li>
      );
    });
  }

//Переключение трека
switchTrack(){
  const times = this.audio.duration;
  let dur = Math.floor(times/60) + ':' + (times%60>10 ? Math.floor(times%60) : '0'+Math.floor(times%60));
  this.setState({
    duration: dur,
    absDuration: Math.floor(times),
    playing: true
  });
  this.visualisationAudio();
}

findId(target){
  //Содержит массив в котором находится нужный элемент с ключом, остальные undefined
  const idx = (target !== undefined) ? target : this.state.currentTrack.key;
  const undefArr = this.state.track.map(function(item, index){
    if(idx === item.key)
      return index;
  }, this); //this сохраняет контекст
  return undefArr.filter(function(item){
    return item !== undefined; //Отфильтруем все элементы undefined
  })[0]; //Единственный, а значит первый индекс элемента нам нужен
}

nextTrack(){
  let currentId = this.findId();
    //Если перебор, то присвоить нуль
  let nextTrack;
  if(this.state.isRepeat)
      nextTrack = this.state.track[currentId];
  else
      nextTrack = (++currentId >= this.state.countTrack) ? this.state.track[0] : this.state.track[currentId];
  this.setState({
    currentTrack: nextTrack
  });
}

prevTrack(){
  let currentId = this.findId();
  let nextTrack;
  if(this.state.isRepeat)
    nextTrack = this.state.track[currentId];
  else
    nextTrack = (--currentId < 0) ? this.state.track[this.state.countTrack-1] : this.state.track[currentId];
  this.setState({
    currentTrack: nextTrack
  });
}

playing(){
  const times = this.audio.currentTime;
  let dur = Math.floor(times/60) + ':' + (times%60>10 ? Math.floor(times%60) : '0'+Math.floor(times%60));
  this.setState({
    position: dur,
    absPosition: Math.floor(times)
  });
}

changePos(e){
  const times = this.audio.currentTime = e.target.value;
  let dur = Math.floor(times/60) + ':' + (times%60>10 ? Math.floor(times%60) : '0'+Math.floor(times%60));
  this.setState({
    position: dur,
    absPosition: Math.floor(times)
  });
}

playPause(){
  let played = this.state.playing;
  if(played)
    this.audio.pause();
  else
    this.audio.play();

  this.setState({
    playing: !played
  });
}

shuffle(){
  let shuffleArr = this.state.track.slice();
  if(this.state.isShuffle)
    shuffleArr.sort(function(a,b){
      return a.key > b.key;
    });
  else
    shuffleArr.sort(function(){
      return Math.random() - 0.5;
    });
  this.setState({
    track: shuffleArr,
    isShuffle: !this.state.isShuffle
  });
}

repeat(){
  this.setState({
    isRepeat: !this.state.isRepeat
  });
}

visualisationAudio() {
  window.requestAnimationFrame(() => this.visualisationAudio(), this.canvas);

  var freqByteData = new Uint8Array(this.analyser.frequencyBinCount); //Создается массив частот
  this.analyser.getByteFrequencyData(freqByteData);                   //Заполняем его данными
  var ctx = this.canvas.getContext('2d');

  const CANVAS_SIZE = this.canvas.height = this.canvas.width;

  const SPACER_WIDTH = 10;                                 //Расстояние между столбцов
  const BAR_WIDTH = 5;                                     //Ширина столбца
  const OFFSET = 100;                                      //Отступ в спектре
  const numBars = Math.round(CANVAS_SIZE / SPACER_WIDTH); //Количество столбцов

  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE); //Очистка всего Canvas
  ctx.lineCap = 'round'; //Тип линии

  var grd=ctx.createLinearGradient(0,0,0,200);
  grd.addColorStop(1,"#1e88e5");
  grd.addColorStop(0,"#0d47a1");
  ctx.fillStyle=grd;


  for (var i = 0; i < numBars; ++i) {
    var magnitude = freqByteData[i + OFFSET];
    ctx.fillRect(i * SPACER_WIDTH, CANVAS_SIZE, BAR_WIDTH, -magnitude);
  }
}

volume = (e) => {
  this.audio.volume = e.target.value / 10;
  this.setState({
    volume: e.value / 10
  });
}

mute(){
  this.audio.volume = this.state.isMute ? 0 : this.state.volume;
  this.setState({
    isMute: !this.state.isMute
  });
}

drop = (e) => {
  e.preventDefault();
  let files = e.dataTransfer.files;
  this.upload(files);
}

drag = (e) => {
  e.preventDefault();
}

render(){
  const LoadTemplate = (
                <div className='progress'>
                    <div className='indeterminate'></div>
                </div>);
  const Loading = !!this.state.numberLoad && LoadTemplate;

  //Отображение текущего проигрываемого трека
  const title = this.state.currentTrack.artist + ' - ' + this.state.currentTrack.title;
  const current = this.state.currentTrack.title ? title : this.state.currentTrack.artist;
  const playPause = this.state.playing ? Icons.pause : Icons.play;
  const repeat = this.state.isRepeat ? 'active' : '';
  const shuffle = this.state.isShuffle ? 'active' : '';
  return(
      <div className='top' onDrop={this.drop} onDragOver={this.drag}>
        <div className='playlist-sidebar'>
          <audio src={this.state.currentTrack.source} id='music'
          onDurationChange={() => this.switchTrack()}
          onEnded={() => this.nextTrack()}
          onTimeUpdate={() => this.playing()}
          autoPlay></audio>
          <ul>{this.renderList()}</ul>
          <div className='playlist-sidebar-down'>
              {Loading}
              <div className='file-upload'>
                <label>
                  <input onChange={this.upload} type='file' id='upload' multiple='multiple' accept='.mp3' />
                  <span>Добавить композиции</span>
                </label>
              </div>
          </div>
        </div>
        <div className="main">
          <canvas id="canvas"></canvas>
          <input type="range" id="track" min="0"
            max={this.state.absDuration}
            value={this.state.absPosition}
            onInput={(e) => this.changePos(e)}
             />
          <div id="infoCurrent">
            <div id="titleComposition">{current}</div>
            <div id="duration">{this.state.position} / {this.state.duration}</div>
          </div>
          <div className="controls">
            <img src={Icons.repeat} className={repeat} id="repeat" alt="repeat" onClick={() => this.repeat()} />
            <img src={Icons.shuffle} className={shuffle} id="shuffle" alt="shuffle" onClick={() => this.shuffle()} />
            <img src={Icons.prev} id="btnPrevTrack" alt="prev" onClick={() => this.prevTrack()}/>
            <img src={playPause} id="play" alt="PLAY" onClick={() => this.playPause()} />
            <img src={Icons.next} id="btnNextTrack" alt="next" onClick={() => this.nextTrack()} />
            <img src={Icons.volume_up} id="btnVol" alt="" onClick={() => this.mute()}/>
            <input type="range" onInput={this.volume} id="volume" min="0" max="10" defaultValue="7" />
          </div>
          </div>
      </div>
  );
}

}

export default Player;
