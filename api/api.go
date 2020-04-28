package api

import (
	"encoding/json"
	"log"
	"net/http"
	"network-policy-explorer/types"
	"sync"
)

type handler struct {
	mutex              sync.RWMutex
	lastAnalysisResult types.AnalysisResult
}

func newHandler() *handler {
	handler := &handler{
		lastAnalysisResult: types.AnalysisResult{
			Pods:          make([]types.Pod, 0),
			AllowedRoutes: make([]types.AllowedRoute, 0),
		},
	}
	return handler
}

func (handler *handler) keepUpdated(resultsChannel <-chan types.AnalysisResult) {
	for {
		newResults := <-resultsChannel
		handler.mutex.Lock()
		handler.lastAnalysisResult = newResults
		handler.mutex.Unlock()
	}
}

func (handler *handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	handler.mutex.RLock()
	defer handler.mutex.RUnlock()
	json.NewEncoder(w).Encode(handler.lastAnalysisResult)
}

func Expose(resultsChannel <-chan types.AnalysisResult) {
	handler := newHandler()
	go handler.keepUpdated(resultsChannel)
	mux := http.NewServeMux()
	mux.Handle("/api/analysisResults", handler)
	log.Println("Listening...")
	http.ListenAndServe(":8000", mux)
}
