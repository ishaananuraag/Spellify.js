console.time('dictonaryLoading');

require.config({
	baseUrl: "./javascripts",
	paths:{
		'default': 'dictionaryx',
	}
});

define(function(){
	
	var Spellify= function(){		
	
		this.__init = function(){
			
			
		}
		
		this._initializeVaraiables = function(){
			this.wordList=[];
			this.wordsTree={};
			this.traversalCharsSet=new Set();
			this.initialized=false;
			
		}
			
		this.configure = function(options){
			var dictionaries=options.dictionaries;
			this._initializeVaraiables();
			
			for(var i = 0 ; i < dictionaries.length;++i){
				var that=this;

				require([dictionaries[i]], function(dictionary){
					for(var word in dictionary){
						that.addToTree(word);
					}
				});
				
			}
		
		}
			
		this.query = function(word,characterClosure){
			if(!this.initialized){
				this._initialize();
			}
		
			return this.queryEngine.query(word,characterClosure);
		
		}		
			
		this._add=function(leftArray, currentTraversingObject, text){
			
			if(!leftArray.length){
				currentTraversingObject.isWord=true;
				currentTraversingObject.text=text;
				return;
			}
			
			var currentWord=leftArray.splice(0,1)[0];
			
			this.traversalCharsSet.add(currentWord)
			
			if(!currentTraversingObject[currentWord]){
				currentTraversingObject[currentWord]={};
			}
			
			this._add(leftArray,currentTraversingObject[currentWord],text+currentWord);
		}
						
		this.addToTree = function(word){
			var characters=word.split('');
			this._add(characters, this.wordsTree,'');
		}
	
		this._addToWordList = function(currentTraversingObject){
			if(currentTraversingObject.isWord){
				this.wordList.push(currentTraversingObject.text/*currentPath.join('')*/);
			}
			
			for(var character in currentTraversingObject){
				if(character.length!=1){
					continue;
				}
				this._addToWordList(currentTraversingObject[character]);
			}
		}

		this.spellCheck = function(line){
			if(!this.initialized){
				this._initialize();
			}
			return this.spellChecker.checkSpelling(line);
		}
		
		this._initialize = function(){
			this.queryEngine=new QueryEngine({
					wordsTree: this.wordsTree,
					traversalChars: Array.from(this.traversalCharsSet)
				});
			
			this.spellChecker=new SpellChecker({
					wordsTree: this.wordsTree,
					traversalChars: Array.from(this.traversalCharsSet)
				});
			this.createSelfParseList();
			this.initialized=true;
		}		
			
		this.createSelfParseList= function(){
			this._addToWordList(this.wordsTree);
		}
		
		this.__init();
	}
	
	
	var SpellChecker = function(options){
		
		this.__init=function(options){
			this.wordsTree=options.wordsTree;
			this.traversalChars=options.traversalChars;
		}
		
		this._check = function(letterArray){
			var _ittrLength=letterArray.length,
				currentObject=this.wordsTree;
			
			for(var i=0;i<_ittrLength;++i)
			{
				if(currentObject[letterArray[i]]){
					currentObject=currentObject[letterArray[i]];
				}else{
					return false;
				}
			}
			return true;
		}
		
		
		this.checkSpelling = function(_string){
			var words=_string.split(' '),
				incorrectWords=[];
			
			for(var i=0;i<words.length;++i){
				if(!this._check(words[i].trim().split(''), this.wordsTree)){
					incorrectWords.push(words[i]);
				}
			}
			return { correct:!incorrectWords.length, incorrect: incorrectWords}
		}
		
		this.__init(options);
		
	}
	
	var QueryEngine = function(options){
		
		this.__init=function(options){
			this.wordsTree=options.wordsTree;
			this.traversalChars=options.traversalChars;
		}
		
		this._queryForArray = function(_iterables, _leftIterators, currentObject, currentWordList){

			_leftIterators=_leftIterators.slice(1);
			var noFixedChar=true;
			for(var j=0;j<_leftIterators.length && noFixedChar;++j){
				if(_leftIterators[j]!=='*' && _leftIterators[j]!=='?'){
					noFixedChar=false;
				}
				
			}
			
			
			for(var i=0;i<_iterables.length;++i){
				
				if(_iterables[i]==='' ){
					if(noFixedChar && currentObject.isWord){
						currentWordList.add(currentObject.text);
					}
					this._query(_leftIterators, currentObject, currentWordList);
				} else
					if(currentObject[_iterables[i]]){
						this._query(_leftIterators, currentObject[_iterables[i]], currentWordList);
					}
			}
			
		}
		
		this._querryForStar = function(_iterables, currentObject, currentWordList){
			var _ittrLength=this._characterClosure.length;
			for(var i=0;i<_ittrLength;++i){
				if(currentObject[this._characterClosure[i]]){
					this._query(_iterables, currentObject[this._characterClosure[i]], currentWordList)
				}
			}
			if(_iterables[1]){
				this._query(_iterables.slice(1), currentObject, currentWordList)
			}
			
		}
		
		this._query = function(_iterables, currentObject, currentWordList){
			
			var _currentSelector=_iterables[0];

			if(!_iterables.length || (_currentSelector==='*' && _iterables.length===1)){
				if(currentObject.isWord){
					currentWordList.add(currentObject.text);
				}
			} 
			if(_currentSelector === '*'){
				this._querryForStar( _iterables, currentObject, currentWordList)
			}else if(typeof _currentSelector === 'object'){
				this._queryForArray(_currentSelector, _iterables, currentObject, currentWordList);
			}else if(currentObject[_currentSelector]){
				this._query(_iterables.slice(1), currentObject[_currentSelector],currentWordList);
			}	
			
		}
		
		
		
		
		this.query = function(word, characterClosure){

			var _characterClosure = characterClosure,
				_traversalChars = this.traversalChars,
				_characterClosureForOptional = _characterClosure?_characterClosure.concat(['']):null;
				_traversalCharsForOptional = _traversalChars.concat(['']);
			
			
			var _iterables=word.replace(/\*+/g,'*').split('').map(function(character){
				if(character==='.'){
					return _characterClosure || _traversalChars;
				}else if(character==='?'){
					return _characterClosureForOptional || _traversalCharsForOptional;
				}
				return character;
			});
			
			var wordSet=new Set();
			this._characterClosure=_characterClosure || _traversalChars;
			
			this._query(_iterables,this.wordsTree,wordSet);

			delete this._characterClosure;
			return Array.from(wordSet);
			
		}
		
		this.__init(options);
	}
	
	var spellify=new Spellify();
	
	spellify.configure({
		dictionaries: ['default']
	})
	
	window.spellify=spellify;
	
	

	
});