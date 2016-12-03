1) download polimorf-xxxxxxxx.tab.gz from http://sgjp.pl/morfeusz/dopobrania.html
2) unzip it
3) open julia, include Tagset.jl, Morfeusz.jl, Liquify.jl (in that order)
3) run Morfeusz.build("polimorf-xxxxxxxx.tab")
4) run Liquify.build("polimorf-xxxxxxxx.tab","dict.db")
5) output is saved into dict.db
6) compress dict.db with LZMA compresor (e.g. using LZMA SDK binaries)