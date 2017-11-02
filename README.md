### What is this? 

Super basic draft of the attempt of porting Myers algorithm along with pre-optimizations. 

Instead of using virtual DOM, the diffing is done on real DOM trees.

It has rough edges/bugs that need polishing, structuring, refactoring, and adapting to a given implementation(s). 

#### TODO:

- ~~Put diff methods to the separate module file (extract)~~
- ~~Make algorithm  pluggable for any native DOM patch(er) you compose it with~~
- ~~Turn the current patcher in an optional (example) dependency~~
